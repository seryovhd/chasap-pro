import moment from "moment";
import * as Sentry from "@sentry/node";
import CheckContactOpenTickets from "../../helpers/CheckContactOpenTickets";
import SetTicketMessagesAsRead from "../../helpers/SetTicketMessagesAsRead";
import { getIO } from "../../libs/socket";
import Ticket from "../../models/Ticket";
import Setting from "../../models/Setting";
import Queue from "../../models/Queue";
import ShowTicketService from "./ShowTicketService";
import ShowWhatsAppService from "../WhatsappService/ShowWhatsAppService";
import SendWhatsAppMessage from "../WbotServices/SendWhatsAppMessage";
import FindOrCreateATicketTrakingService from "./FindOrCreateATicketTrakingService";
import GetTicketWbot from "../../helpers/GetTicketWbot";
import { verifyMessage } from "../WbotServices/wbotMessageListener";
import ListSettingsServiceOne from "../SettingServices/ListSettingsServiceOne"; //NOVO Whaticket SaaS//
import ShowUserService from "../UserServices/ShowUserService"; //NOVO Whaticket SaaS//
import { isNil } from "lodash";
import Whatsapp from "../../models/Whatsapp";
import { Op } from "sequelize";
import AppError from "../../errors/AppError";


interface TicketData {
  status?: string;
  userId?: number | null;
  queueId?: number | null;
  chatbot?: boolean;
  queueOptionId?: number;
  whatsappId?: string;
  useIntegration?: boolean;
  integrationId?: number | null;
  promptId?: number | null;
  lastMessage?: string;
}

interface Request {
  ticketData: TicketData;
  ticketId: string | number;
  companyId: number;
}

interface Response {
  ticket: Ticket;
  oldStatus: string;
  oldUserId: number | undefined;
}

const UpdateTicketService = async ({
  ticketData,
  ticketId,
  companyId
}: Request): Promise<Response> => {

  try {
    let { status } = ticketData;
    let { queueId, userId, whatsappId, lastMessage = null } = ticketData;
    let chatbot: boolean | null = ticketData.chatbot || false;
    let queueOptionId: number | null = ticketData.queueOptionId || null;
    let promptId: number | null = ticketData.promptId || null;
    let useIntegration: boolean | null = ticketData.useIntegration || false;
    let integrationId: number | null = ticketData.integrationId || null;

    //console.log("🎫 TICKET DATA:", ticketData);

    const io = getIO();

    const ticket = await ShowTicketService(ticketId, companyId);
    const ticketTraking = await FindOrCreateATicketTrakingService({
      ticketId,
      companyId,
      whatsappId: ticket.whatsappId
    });

    if (isNil(whatsappId)) {
      whatsappId = ticket.whatsappId?.toString();
    }

    await SetTicketMessagesAsRead(ticket);

    const oldStatus = ticket.status;
    const oldUserId = ticket.user?.id;
    const oldQueueId = ticket.queueId;

    if (oldStatus === "closed" || Number(whatsappId) !== ticket.whatsappId) {
      await CheckContactOpenTickets(ticket.contact.id, whatsappId);
      chatbot = null;
      queueOptionId = null;
    }

    if (status === "closed") {
      const { complationMessage, ratingMessage } = ticket.whatsappId
        ? await ShowWhatsAppService(ticket.whatsappId, companyId)
        : { complationMessage: null, ratingMessage: null };

      const settingEvaluation = await ListSettingsServiceOne({
        companyId: companyId,
        key: "userRating"
      });

      // Envia a mensagem de avaliação apenas se o ticket não estiver em status 'pendente'
      if (
        ticket.status !== "pending" &&  // Adiciona a verificação para evitar avaliação em status pendente
        !ticket.contact.isGroup &&
        !ticket.contact.disableBot &&
        settingEvaluation?.value === "enabled"
      ) {
        if (ticketTraking.ratingAt == null && ticketTraking.userId !== null) {
          const bodyRatingMessage = `${ratingMessage ? ratingMessage + "\n\n" : ""
            }Digite de 1 a 5 para qualificar nosso atendimento:\n\n*1* - 😞 _Péssimo_\n*2* - 😕 _Ruim_\n*3* - 😐 _Neutro_\n*4* - 🙂 _Bom_\n*5* - 😊 _Ótimo_`;

          await SendWhatsAppMessage({ body: bodyRatingMessage, ticket });

          await ticketTraking.update({
            ratingAt: moment().toDate()
          });

          // Remove o ticket da lista de abertos
          io.to(`company-${ticket.companyId}-open`)
            .to(`queue-${ticket.queueId}-open`)
            .to(ticketId.toString())
            .emit(`company-${ticket.companyId}-ticket`, {
              action: "delete",
              ticketId: ticket.id
            });

          return { ticket, oldStatus, oldUserId };
        }

        ticketTraking.ratingAt = moment().toDate();
        ticketTraking.rated = false;
      } else {
        // Envia apenas a mensagem de finalização se estiver configurada
        ticketTraking.finishedAt = moment().toDate();

        if (
          !ticket.contact.isGroup &&
          !ticket.contact.disableBot &&
          !isNil(complationMessage) &&
          complationMessage !== ""
        ) {
          const body = `\u200e${complationMessage}`;
          await SendWhatsAppMessage({ body, ticket });
        }
      }

      await ticket.update({
        promptId: null,
        integrationId: null,
        useIntegration: false,
        typebotStatus: false,
        typebotSessionId: null
      });

      ticketTraking.finishedAt = moment().toDate();
      ticketTraking.whatsappId = ticket.whatsappId;
      ticketTraking.userId = ticket.userId;

    }

    if (queueId !== undefined && queueId !== null) {
      ticketTraking.queuedAt = moment().toDate();
    }

    const settingsTransfTicket = await ListSettingsServiceOne({ companyId: companyId, key: "sendMsgTransfTicket" });

    if (settingsTransfTicket?.value === "enabled") {
      // Mensagem de transferencia da FILA
      if (oldQueueId !== queueId && oldUserId === userId && !isNil(oldQueueId) && !isNil(queueId)) {

        const queue = await Queue.findByPk(queueId);
        const wbot = await GetTicketWbot(ticket);
        const msgtxt = `*Mensaje automático*:
        Has sido transferido al departamento *${queue?.name}*
        por favor, espera, ¡te atenderemos en breve!`;

        const queueChangedMessage = await wbot.sendMessage(
          `${ticket.contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`,
          {
            text: msgtxt
          }
        );
        await verifyMessage(queueChangedMessage, ticket, ticket.contact);
      }
      else
        // Mensagem de transferencia do ATENDENTE
        if (oldUserId !== userId && oldQueueId === queueId && !isNil(oldUserId) && !isNil(userId)) {
          const wbot = await GetTicketWbot(ticket);
          const nome = await ShowUserService(ticketData.userId);
          const msgtxt = `*Mensaje automático*:
          Has sido transferido al agente *${nome?.name}*
          por favor, espera, ¡te atenderemos en breve!`;

          const queueChangedMessage = await wbot.sendMessage(
            `${ticket.contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`,
            {
              text: msgtxt
            }
          );
          await verifyMessage(queueChangedMessage, ticket, ticket.contact);
        }
        else
          // Mensagem de transferencia do ATENDENTE e da FILA
          if (oldUserId !== userId && !isNil(oldUserId) && !isNil(userId) && oldQueueId !== queueId && !isNil(oldQueueId) && !isNil(queueId)) {
            const wbot = await GetTicketWbot(ticket);
            const queue = await Queue.findByPk(queueId);
            const nome = await ShowUserService(ticketData.userId);
            const msgtxt = `*Mensaje automático*:
            Has sido transferido al departamento *${queue?.name}* y contarás con la asistencia de *${nome?.name}*
            por favor, espera, ¡te atenderemos en breve!`;

            const queueChangedMessage = await wbot.sendMessage(
              `${ticket.contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`,
              {
                text: msgtxt
              }
            );
            await verifyMessage(queueChangedMessage, ticket, ticket.contact);
          } else
            if (oldUserId !== undefined && isNil(userId) && oldQueueId !== queueId && !isNil(queueId)) {

              const queue = await Queue.findByPk(queueId);
              const wbot = await GetTicketWbot(ticket);
              const msgtxt = `*Mensaje automático*:
              Has sido transferido al departamento *${queue?.name}*
              por favor, espera, ¡te atenderemos en breve!`;

              const queueChangedMessage = await wbot.sendMessage(
                `${ticket.contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`,
                {
                  text: msgtxt
                }
              );
              await verifyMessage(queueChangedMessage, ticket, ticket.contact);
            }
    }
    if (status === "closed") {
      const rememberAgentSetting = await ListSettingsServiceOne({
        companyId,
        key: "rememberCustomerAgent"
      });

      const shouldKeepAgent = rememberAgentSetting?.value === "enabled";
      //console.log("shouldKeepAgent:", shouldKeepAgent);
      if (!shouldKeepAgent) {
        userId = null;
        queueId = null;
      }
    }
    if (ticket.isGroup) {
      status = "open";
      userId = null;
    }
    await ticket.update({
      status,
      queueId,
      userId,
      whatsappId,
      chatbot,
      queueOptionId,
      lastMessage: lastMessage !== null ? lastMessage : ticket.lastMessage
    });

    await ticket.reload();

    if (status === "pending") {
      await ticketTraking.update({
        whatsappId,
        queuedAt: moment().toDate(),
        startedAt: null,
        userId: null
      });
    }

    if (status === "open") {
      await ticketTraking.update({
        startedAt: moment().toDate(),
        ratingAt: null,
        rated: false,
        whatsappId,
        userId: ticket.userId
      });
    }

    await ticketTraking.save();

    if (ticket.status !== oldStatus || ticket.user?.id !== oldUserId) {

      io.to(`company-${companyId}-${oldStatus}`)
        .to(`queue-${ticket.queueId}-${oldStatus}`)
        .to(`user-${oldUserId}`)
        .emit(`company-${companyId}-ticket`, {
          action: "delete",
          ticketId: ticket.id
        });
    }

    io.to(`company-${companyId}-${ticket.status}`)
      .to(`company-${companyId}-notification`)
      .to(`queue-${ticket.queueId}-${ticket.status}`)
      .to(`queue-${ticket.queueId}-notification`)
      .to(ticketId.toString())
      .to(`user-${ticket?.userId}`)
      .to(`user-${oldUserId}`)
      .emit(`company-${companyId}-ticket`, {
        action: "update",
        ticket
      });

    return { ticket, oldStatus, oldUserId };
  } catch (err) {
    Sentry.captureException(err);
  }
};

export default UpdateTicketService;
