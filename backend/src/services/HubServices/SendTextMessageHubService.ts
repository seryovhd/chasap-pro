require("dotenv").config();
const { Client, TextContent, FileContent } = require("notificamehubsdk");
import Contact from "../../models/Contact";
import Ticket from "../../models/Ticket";
import CreateMessageService from "./CreateHubMessageService";
import { showHubToken } from "../../helpers/showHubToken";
import { getIO } from "../../libs/socket";

// Función para seleccionar el canal y número de contacto según el tipo de mensaje
const selectChannelAndContactNumber = (contact: Contact, client: typeof Client) => {
  let channelClient;
  let contactNumber;
  let channelType;

  // PARCHE 1.3.1 - WEBCHAT
  if (contact.messengerId && (!contact.instagramId || contact.canal === "Facebook")) {
    contactNumber = contact.messengerId;
    channelType = "facebook";
  } else if (contact.instagramId || contact.canal === "Instagram") {
    contactNumber = contact.instagramId;
    channelType = "instagram";
  } else if (contact.canal === "webchat") {
    contactNumber = contact.number;
    channelType = "webchat";
  }

  // PARCHE 1.3.1 - WEBCHAT FIN
  if (channelType) {
    channelClient = client.setChannel(channelType);
    console.log("TIPO HUB CHAT:: ", channelType);
  }

  return { channelClient, contactNumber };
};

export const SendTextMessageService = async (
  message: string,
  ticketId: number,
  contact: Contact,
  connection: any,
  companyIdOld: number, // Solo para completar la cantidad de argumentos
  channelType: string // ← nuevo argumento
) => {
  try {
    // Buscar el ticket y obtener el companyId
    const ticket = await Ticket.findOne({ where: { id: ticketId } });
    if (!ticket) {
      throw new Error(`Ticket con ID ${ticketId} no encontrado`);
    }
    
    const { companyId } = ticket;
    
    let notificameHubToken;
    try {
      notificameHubToken = await showHubToken(companyId);
    } catch (err) {
      throw new Error("Error al obtener el token de NotificameHub: " + err.message);
    }
    console.log("HUB TOKEN:: ", notificameHubToken);
    const client = new Client(notificameHubToken);
    
    const { channelClient, contactNumber } = selectChannelAndContactNumber(contact, client);
    
    if (!channelClient || !contactNumber) {
      throw new Error(`No se pudo seleccionar el canal de comunicación adecuado. channelClient: ${channelClient}, contactNumber: ${contactNumber}`);
    }      

    // Limpiar el mensaje (remover saltos de línea)
    message = message.replace(/\n/g, " ");

    const content = new TextContent(message);

    console.log({
      token: connection.qrcode,
      number: contactNumber,
      content,
      message,
      companyId
    });

    // Enviar mensaje
    console.log("TOKEN HUB:: ",connection.qrcode);
    const response = await channelClient.sendMessage(connection.qrcode, contactNumber, content);
    // console.log("📬 RESPUESTA:: ", response);  // HUB DEPURACIÓN

    // Parsear respuesta
    let data: any;
    try {
      // Verificar si la respuesta es una cadena antes de aplicar indexOf
      if (typeof response === "string") {
        const jsonStart = response.indexOf("{");
        const jsonResponse = response.substring(jsonStart);
        data = JSON.parse(jsonResponse);
      } else if (typeof response === "object") {
        // Si ya es un objeto, asignarlo directamente
        data = response;
      } else {
        throw new Error("La respuesta no es ni un objeto ni una cadena válida.");
      }
    } catch (error) {
      console.error("Error al parsear la respuesta:", error);
      throw new Error("La respuesta del servidor no es válida.");
    }


    // Crear el nuevo mensaje en la base de datos
    const newMessage = await CreateMessageService({
      id: data.id,
      contactId: contact.id,
      companyId,
      body: message,
      ticketId,
      fromMe: true
    });

    // Actualizar el último mensaje del ticket
    await Ticket.update({ lastMessage: message }, { where: { id: ticketId } });

    // Emitir eventos de socket
    const io = getIO();
    const updatedTicket = await Ticket.findByPk(ticketId, { include: ["contact"] });
    // console.log("🎫 TICKET ACTUALIZADO DESPUÉS DEL ENVÍO:", updatedTicket); // HUB DEPURACIÓN

    if (updatedTicket) {
      io.to(updatedTicket.status)
        .to(ticketId.toString())
        .emit("message", {
          action: "create",
          message: newMessage,
          ticket: updatedTicket
        });

        console.log("📩 EVENTO 'MESSAGE' EMITIDO PARA ENVÍO:", {
          status: updatedTicket.status,
          ticketId: ticketId.toString(),
          lastMessage: updatedTicket.lastMessage
        });        

      io.to(updatedTicket.status)
        .to(ticketId.toString())
        .emit(`company-${companyId}-ticket`, {
          action: "update",
          ticket: updatedTicket
        });

        console.log("🎫 EVENTO 'TICKET' EMITIDO PARA ENVÍO:", {
          status: updatedTicket.status,
          ticketId: ticketId.toString(),
          lastMessage: updatedTicket.lastMessage
        });        
    }

    return newMessage;
  } catch (error) {
    console.error("ERROR HUB MESSAGE:: ", error);
    throw error;
  }
};
