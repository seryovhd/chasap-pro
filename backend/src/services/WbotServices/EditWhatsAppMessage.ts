import AppError from "../../errors/AppError";
import GetTicketWbot from "../../helpers/GetTicketWbot";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";

interface Request {
  messageId: string;
  body: string;
}

const EditWhatsAppMessage = async ({
  messageId,
  body,
}: Request): Promise<{ ticket: Ticket, message: Message }> => {

  const message = await Message.findByPk(messageId, {
    include: [
      {
        model: Ticket,
        as: "ticket",
        include: ["contact"]
      }
    ]
  });

  if (!message) {
    throw new AppError("No message found with this ID.");
  }
  // Si es privado, solo editar en base de datos y salir
  if (message.isPrivate) {
    await message.update({ body, isEdited: true });
    return { ticket: message.ticket, message };
  }
  // Si es privado, solo editar en base de datos y salir
  if (message.isPrivate) {
    await message.update({ body, isEdited: true });
    return { ticket: message.ticket, message };
  }

  const { ticket } = message;

    const wbot = await GetTicketWbot(ticket);

    const msg = JSON.parse(message.dataJson);

    try {
    await wbot.sendMessage(message.remoteJid, {
      text: body,
      edit: msg.key,
	  },{});

	message.update({ body: body, isEdited: true});
	
    return { ticket: message.ticket , message: message };
  } catch (err) {
	console.log(err);
    throw new AppError("ERR_EDITING_WAPP_MSG");
  }

};

export default EditWhatsAppMessage;