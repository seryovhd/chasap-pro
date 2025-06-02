import { Request, Response } from "express";
import User from "../models/User";
import { getIO } from "../libs/socket";
import Contact from "../models/Contact";
import Ticket from "../models/Ticket";
import Whatsapp from "../models/Whatsapp";
import { SendMediaMessageService } from "../services/HubServices/SendMediaMessageHubService";
import { SendTextMessageService } from "../services/HubServices/SendTextMessageHubService";
import CreateHubTicketService from "../services/HubServices/CreateHubTicketService";

interface TicketData {
  contactId: number;
  status: string;
  queueId: number;
  userId: number;
  channel: string;
  companyId: number;
}

export const send = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;

  console.log("🏢 COMPANY ID DEL USUARIO AUTENTICADO:", companyId);

  const { body: message } = req.body;
  const { ticketId } = req.params;
  const medias = req.files as Express.Multer.File[];

  console.log("🖼️ ARCHIVOS RECIBIDOS:", medias);
  console.log("🌀 ENVIANDO MENSAJE AL HUB EN EL CONTROLADOR");

  const ticket = await Ticket.findOne({
    where: { id: ticketId, companyId },
    include: [
      {
        model: Contact,
        as: "contact",
        // PARCHE 1.3.1 - WEBCHAT
        attributes: ["number", "messengerId", "instagramId", "canal"]
        // PARCHE 1.3.1 - WEBCHAT FIN
      },
      {
        model: Whatsapp,
        as: "whatsapp",
        attributes: ["qrcode", "type", "companyId"]
      }
    ]
  });

  if (!ticket) {
    return res.status(404).json({ message: "Ticket no encontrado" });
  }

  // Detectamos el tipo de canal del contacto
  let channelType = "";
  // console.log("TEST::: ", ticket.contact); // HUB DEPURACIÓN
  // PARCHE 1.3.1 - WEBCHAT
  if (ticket.contact?.messengerId && !ticket.contact?.instagramId) {
    channelType = "facebook";
  } else if (!ticket.contact?.messengerId && ticket.contact?.instagramId) {
    channelType = "instagram";
  } else if (ticket.contact?.canal === "webchat") {
    channelType = "webchat";
  }
  // PARCHE 1.3.1 - WEBCHAT FIN

  // console.log("channelType:: ", channelType); // HUB DEPURACIÓN
  try {
    if (medias && medias.length > 0) {
      // Enviamos todos los archivos recibidos
      console.log("ENVIAMOS ARCHIVOS RECIBIDOS:: ", medias);
      await Promise.all(
        medias.map(async (media: Express.Multer.File) => {
          await SendMediaMessageService(
            media,
            message,
            ticket.id,
            ticket.contact,
            ticket.whatsapp,
            companyId,
            channelType
          );
        })
      );
    } else {
      // Si no hay archivos, enviamos solo el texto
      await SendTextMessageService(
        message,
        ticket.id,
        ticket.contact,
        ticket.whatsapp,
        companyId,
        channelType  // <--- argumento extra
      );
    }

    return res.status(200).json({ message: "Mensaje enviado correctamente" });
  } catch (error) {
    console.error("⚠️ ERROR AL ENVIAR MENSAJE:", error);
    return res.status(400).json({ message: error.body?.message || error.message || error });
  }
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { contactId, status, userId, channel }: TicketData = req.body;

  const { companyId } = req.user;

  const ticket = await CreateHubTicketService({
    contactId,
    status,
    userId,
    channel,
    companyId
  });

  const io = getIO();
  io.to(ticket.status).emit("ticket", {
    action: "update",
    ticket
  });

  return res.status(200).json(ticket);
};
