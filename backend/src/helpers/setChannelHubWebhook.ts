import Whatsapp from "../models/Whatsapp";
import { IChannel } from "../controllers/ChannelHubController";
import { showHubToken } from "./showHubToken";
const {
  Client,
  MessageSubscription
} = require("notificamehubsdk");
require("dotenv").config();

// Función para configurar el webhook de un canal de WhatsApp
export const setChannelWebhook = async (
  whatsapp: IChannel | any, // Canal de WhatsApp con sus detalles
  whatsappId: string // ID del canal de WhatsApp
) => {
  // Obtenemos el token de autenticación para Notificame Hub
const companyId = whatsapp.companyId;
const notificameHubToken = await showHubToken(companyId);

  // Creamos un cliente para interactuar con Notificame Hub
  const client = new Client(notificameHubToken);

  // URL del webhook
  const url = process.env.NGROK_URL && process.env.NGROK_URL !== ''
  ? `${process.env.NGROK_URL}/hub-webhook/${whatsapp.qrcode}`
  : `${process.env.BACKEND_URL}/hub-webhook/${whatsapp.qrcode}`;

  // Creamos una suscripción para recibir mensajes del canal en el webhook especificado
  const subscription = new MessageSubscription(
    {
      url // URL donde se recibirán los mensajes
    },
    {
      channel: whatsapp.qrcode // Canal de WhatsApp para el que se crea la suscripción
    }
  );

  // Intentamos crear la suscripción al webhook
  client
    .createSubscription(subscription)
    .then((response: any) => {
      console.log("📬 WEBHOOK SUSCRITO:", response); // Mensaje en consola si la suscripción es exitosa
    })
    .catch((error: any) => {
      console.log("❌ ERROR:", error);  // Mensaje en consola si ocurre un error al crear la suscripción
    });

  // Actualizamos el estado del canal de WhatsApp a "CONNECTED"
  await Whatsapp.update(
    {
      status: "CONNECTED" // Cambiamos el estado del canal a "CONNECTED"
    },
    {
      where: {
        id: whatsappId // Buscamos el canal por su ID
      }
    }
  );
};
