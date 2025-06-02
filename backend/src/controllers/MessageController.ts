import { Request, Response } from "express";
import AppError from "../errors/AppError";

import formatBody from "../helpers/Mustache";
import SetTicketMessagesAsRead from "../helpers/SetTicketMessagesAsRead";
import { getIO } from "../libs/socket";
import Ticket from "../models/Ticket";
import Message from "../models/Message";
import Queue from "../models/Queue";
import User from "../models/User";
import Whatsapp from "../models/Whatsapp";
import CreateOrUpdateContactService from "../services/ContactServices/CreateOrUpdateContactService";
import SendWhatsAppReaction from "../services/WbotServices/SendWhatsAppReaction";
import ListMessagesService from "../services/MessageServices/ListMessagesService";
import FindOrCreateTicketService from "../services/TicketServices/FindOrCreateTicketService";
import ShowTicketService from "../services/TicketServices/ShowTicketService";
import UpdateTicketService from "../services/TicketServices/UpdateTicketService";
import CheckContactNumber from "../services/WbotServices/CheckNumber";
import DeleteWhatsAppMessage from "../services/WbotServices/DeleteWhatsAppMessage";
import GetProfilePicUrl from "../services/WbotServices/GetProfilePicUrl";
import SendWhatsAppMedia from "../services/WbotServices/SendWhatsAppMedia";
import SendWhatsAppMessage from "../services/WbotServices/SendWhatsAppMessage";
import EditWhatsAppMessage from "../services/WbotServices/EditWhatsAppMessage";
import CheckIsValidContact from "../services/WbotServices/CheckIsValidContact";
import crypto from "crypto";

type IndexQuery = {
  pageNumber: string;
};

type MessageData = {
  body: string;
  fromMe: boolean;
  read: boolean;
  quotedMsg?: Message;
  number?: string;
  closeTicket?: true;
  isPrivate?: boolean;
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { ticketId } = req.params;
  const { pageNumber } = req.query as IndexQuery;
  const { companyId, profile } = req.user;
  const queues: number[] = [];

  if (profile !== "admin") {
    const user = await User.findByPk(req.user.id, {
      include: [{ model: Queue, as: "queues" }]
    });
    user.queues.forEach(queue => {
      queues.push(queue.id);
    });
  }

  const { count, messages, ticket, hasMore } = await ListMessagesService({
    pageNumber,
    ticketId,
    companyId,
    queues
  });

  SetTicketMessagesAsRead(ticket);

  return res.json({ count, messages, ticket, hasMore });
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { ticketId } = req.params;
  const { body, quotedMsg, isPrivate }: MessageData = req.body;
  const medias = req.files as Express.Multer.File[];
  const { companyId } = req.user;

  const ticket = await ShowTicketService(ticketId, companyId);

  SetTicketMessagesAsRead(ticket);

  if (medias) {
    await Promise.all(
      medias.map(async (media: Express.Multer.File, index) => {
        await SendWhatsAppMedia({ media, ticket, body: Array.isArray(body) ? body[index] : body });
      })
    );
    } else {
  if (isPrivate) {
 const id = crypto.randomBytes(11).toString("hex").toUpperCase();
  await Message.create({
    id,
    body,
    fromMe: true,
    read: true,
    quotedMsgId: quotedMsg?.id,
    ticketId: ticket.id,
    isPrivate,
    companyId: ticket.companyId,
    queueId: ticket.queueId
  });

  const io = getIO();
  const msg = await Message.findByPk(id, {
    include: ["contact", "quotedMsg", "ticket"]
  });

const fullTicket = await ShowTicketService(ticket.id, companyId); // asegúrate que incluye contacto

io.to(String(ticket.id)).emit(`company-${companyId}-appMessage`, {
  action: "create",
  message: msg,
  ticket: fullTicket
});


  return res.send();
  } else {
    await SendWhatsAppMessage({ body, ticket, quotedMsg });
  }
}
  return res.send();
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { messageId } = req.params;
  const { companyId } = req.user;

  const message = await DeleteWhatsAppMessage(messageId);

  const io = getIO();
  const fullTicket = await ShowTicketService(message.ticketId, companyId);
/*   console.log("📡 Enviando evento al socket:", {
  ticketRoom: String(message.ticketId),
  action: "update",
  messageId: message.id,
  isDeleted: message.isDeleted,
  body: message.body
}); */

  io.to(String(message.ticketId)).emit(`company-${companyId}-appMessage`, {
    action: "update",
    message,
    ticket: fullTicket
  });

  return res.send();
};

export const send = async (req: Request, res: Response): Promise<Response> => {
  const { whatsappId } = req.params as unknown as { whatsappId: number };
  const messageData: MessageData = req.body;
  const medias = req.files as Express.Multer.File[];

  try {
    const whatsapp = await Whatsapp.findByPk(whatsappId);

    if (!whatsapp) {
      throw new Error("No fue posible realizar la operación");
    }

    if (messageData.number === undefined) {
      throw new Error("El número es obligatorio");
    }

    const numberToTest = messageData.number;
    const body = messageData.body;

    const companyId = whatsapp.companyId;

    const CheckValidNumber = await CheckContactNumber(numberToTest, companyId);
    const number = CheckValidNumber.jid.replace(/\D/g, "");
    const profilePicUrl = await GetProfilePicUrl(number, companyId);

    const contactData = {
      name: `${number}`,
      number,
      profilePicUrl,
      isGroup: false,
      companyId
    };

    const contact = await CreateOrUpdateContactService(contactData);

    const ticket = await FindOrCreateTicketService(contact, whatsapp.id!, 0, companyId);

    if (medias) {
      await Promise.all(
        medias.map(async (media: Express.Multer.File) => {
          await req.app.get("queues").messageQueue.add(
            "SendMessage",
            {
              whatsappId,
              data: {
                number,
                body: body ? formatBody(body, contact) : media.originalname,
                mediaPath: media.path,
                fileName: media.originalname
              }
            },
            { removeOnComplete: true, attempts: 3 }
          );
        })
      );
    } else {
      await SendWhatsAppMessage({ body: formatBody(body, contact), ticket });

      await ticket.update({
        lastMessage: body
      });
    }

    if (messageData.closeTicket) {
      setTimeout(async () => {
        await UpdateTicketService({
          ticketId: ticket.id,
          ticketData: { status: "closed" },
          companyId
        });
      }, 1000);
    }

    SetTicketMessagesAsRead(ticket);

    return res.send({ mensagem: "Mensaje enviado" });
  } catch (err: any) {
    if (Object.keys(err).length === 0) {
      throw new AppError(
        "No fue posible enviar el mensaje, intenta nuevamente en unos instantes"
      );
    } else {
      throw new AppError(err.message);
    }
  }
};

export const addReaction = async (req: Request, res: Response): Promise<Response> => {
  try {
    const {messageId} = req.params;
    const {type} = req.body; // O tipo de reação, por exemplo, 'like', 'heart', etc.
    const {companyId, id} = req.user;

    const message = await Message.findByPk(messageId);

    const ticket = await Ticket.findByPk(message.ticketId, {
      include: ["contact"]
    });

    if (!message) {
      return res.status(404).send({message: "Mensagem não encontrada"});
    }

    // Envia a reação via WhatsApp
    const reactionResult = await SendWhatsAppReaction({
      messageId: messageId,
      ticket: ticket,
      reactionType: type
    });

    // Atualiza a mensagem com a nova reação no banco de dados (opcional, dependendo da necessidade)
    await message.update({
      reactions: [...message.reactions, {type: type, userId: id}]
    });

    const updatedMessage = await Message.findByPk(message.id, {
      include: ["contact", "quotedMsg", "ticket"]
    });
    
    const io = getIO();
io.to(message.ticketId.toString()).emit(`company-${companyId}-appMessage`, {
  action: "update",
  message: updatedMessage,
  ticket: updatedMessage.ticket
});

    return res.status(200).send({
      message: 'Reação adicionada com sucesso!',
      reactionResult,
      reactions: updatedMessage.reactions
    });
  } catch (error) {
    console.error('Erro ao adicionar reação:', error);
    if (error instanceof AppError) {
      return res.status(400).send({message: error.message});
    }
    return res.status(500).send({message: 'Erro ao adicionar reação', error: error.message});
  }
};

export const sendMessageFlow = async (
  whatsappId: number,
  body: any,
  req: Request,
  files?: Express.Multer.File[]
): Promise<String> => {
  const messageData = body;
  const medias = files;

  try {
    const whatsapp = await Whatsapp.findByPk(whatsappId);

    if (!whatsapp) {
      throw new Error("No fue posible realizar la operación");
    }

    if (messageData.number === undefined) {
      throw new Error("El número es obligatorio");
    }

    const numberToTest = messageData.number;
    const body = messageData.body;

    const companyId = messageData.companyId;

    const CheckValidNumber = await CheckContactNumber(numberToTest, companyId);
    const number = numberToTest.replace(/\D/g, "");

    if (medias) {
      await Promise.all(
        medias.map(async (media: Express.Multer.File) => {
          await req.app.get("queues").messageQueue.add(
            "SendMessage",
            {
              whatsappId,
              data: {
                number,
                body: media.originalname,
                mediaPath: media.path
              }
            },
            { removeOnComplete: true, attempts: 3 }
          );
        })
      );
    } else {
      req.app.get("queues").messageQueue.add(
        "SendMessage",
        {
          whatsappId,
          data: {
            number,
            body
          }
        },
        { removeOnComplete: false, attempts: 3 }
      );
    }

    return "Mensaje enviado";
  } catch (err: any) {
    if (Object.keys(err).length === 0) {
      throw new AppError(
        "No fue posible enviar el mensaje, intenta nuevamente en unos instantes"
      );
    } else {
      throw new AppError(err.message);
    }
  }
};
export const edit = async (req: Request, res: Response): Promise<Response> => {
  const { messageId } = req.params;
  const { companyId } = req.user;
  const { body }: MessageData = req.body;
  console.log("📄 CUERPO:", body);
  const { ticket , message } = await EditWhatsAppMessage({messageId, body});

  const io = getIO();
 io.emit(`company-${companyId}-appMessage`, {
    action:"update",
    message,
    ticket: ticket,
    contact: ticket.contact,
  });

  return res.send();
};
