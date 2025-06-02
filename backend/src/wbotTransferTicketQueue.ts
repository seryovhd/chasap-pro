import { Op } from "sequelize";
import TicketTraking from "./models/TicketTraking";
import moment from "moment";
import Ticket from "./models/Ticket";
import Whatsapp from "./models/Whatsapp";
import { getIO } from "./libs/socket";
import { logger } from "./utils/logger";
import ShowTicketService from "./services/TicketServices/ShowTicketService";

export const TransferTicketQueue = async (): Promise<void> => {
  const io = getIO();

  //logger.info(`🚀 SERVICIO DE TRANSFERENCIA DE TICKETS INICIADO`);
  //logger.info(`🔍 BUSCANDO TICKETS SIN FILA ASIGNADA...`);

  const tickets = await Ticket.findAll({
    where: {
      status: "pending",
      queueId: { [Op.is]: null }
    }
  });

  logger.info(`📋 TICKETS ENCONTRADOS PARA EVALUAR: ${tickets.length}`);

  for (const ticket of tickets) {
    const wpp = await Whatsapp.findOne({ where: { id: ticket.whatsappId } });

    if (!wpp || !wpp.transferQueueId || !wpp.timeToTransfer || wpp.timeToTransfer === 0) {
      logger.warn(`⚠️ TICKET ${ticket.id} NO SE TRANSFIERE: WHATSAPP SIN CONFIGURACIÓN VÁLIDA`);
      continue;
    }

    const ticketTraking = await TicketTraking.findOne({
      where: { ticketId: ticket.id },
      order: [["createdAt", "DESC"]]
    });

    if (!ticketTraking) {
      logger.warn(`⚠️ TICKET ${ticket.id} NO TIENE REGISTRO DE TICKETTRAKING.`);
      continue;
    }

    const limite = moment(ticketTraking.createdAt).add(wpp.timeToTransfer, "minutes");

    // 1️⃣ Transferir tickets sin integración después del tiempo configurado
    if (ticket.useIntegration === false && moment().isAfter(limite)) {
      await ticket.update({
        queueId: wpp.transferQueueId
      });

      await ticketTraking.update({
        queuedAt: moment().toDate(),
        queueId: wpp.transferQueueId
      });

      const currentTicket = await ShowTicketService(ticket.id, ticket.companyId);

      io.to(ticket.status)
        .to("notification")
        .to(ticket.id.toString())
        .emit(`company-${ticket.companyId}-ticket`, {
          action: "update",
          ticket: currentTicket,
          traking: "CREATED TICKET POR TIMEOUT"
        });

      logger.info(`🎟️ TICKET ${ticket.id} TRANSFERIDO A FILA ${wpp.transferQueueId} POR TIMEOUT`);
    }

    // 2️⃣ Transferir tickets atascados con integración activa por más de 1 hora
    if (ticket.useIntegration === true) {
      const stuck = moment(ticket.updatedAt).isBefore(moment().subtract(1, "hour"));

      if (stuck) {
        await ticket.update({
          queueId: wpp.transferQueueId,
          useIntegration: false,
          integrationId: null
        });

        await ticketTraking.update({
          queuedAt: moment().toDate(),
          queueId: wpp.transferQueueId
        });

        const currentTicket = await ShowTicketService(ticket.id, ticket.companyId);

        io.to(ticket.status)
          .to("notification")
          .to(ticket.id.toString())
          .emit(`company-${ticket.companyId}-ticket`, {
            action: "update",
            ticket: currentTicket,
            traking: "CREATED TICKET STUCK FALLBACK"
          });

        logger.warn(`🛑 TICKET ${ticket.id} ESTABA ATASCADO CON INTEGRACIÓN. TRANSFERIDO FORZADAMENTE A FILA ${wpp.transferQueueId}`);
      }
    }
  }
};