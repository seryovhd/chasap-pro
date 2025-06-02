import { showHubToken } from "../../helpers/showHubToken";
const { Client, FileContent } = require("notificamehubsdk");
const ffmpeg = require("fluent-ffmpeg");
import Contact from "../../models/Contact";
import Ticket from "../../models/Ticket";
import CreateMessageService from "./CreateHubMessageService";
import { convertMp3ToMp4 } from "../../helpers/ConvertMp3ToMp4";
import * as fs from "fs";
import { join } from "path";

// Función para convertir un vídeo MP4 a un formato compatible
const convertVideoToCompatibleFormat = async (inputPath: string, destination: string) => {
  const outputFilename = `${Date.now()}.mp4`;
  const outputPath = join(destination, outputFilename);

  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .output(outputPath)
      .videoCodec("libx264")
      .audioCodec("aac")
      .outputOptions([
        "-profile:v baseline", 
        "-level 3.0", 
        "-movflags +faststart"
      ])
      .size("854x480")
      .on("end", resolve)
      .on("error", reject)
      .run();
  }).then(() => outputFilename);
};

// Función para ajustar los metadatos del medio según el tipo de mensaje
const adjustMediaMetadata = (media: Express.Multer.File, type: string) => {
  let mediaUrl;
  if (media.mimetype.includes("image")) {
    media.mimetype = type === "telegram" ? "photo" : "image";
  } else if (media.mimetype.includes("audio") && (type === "telegram" || type === "facebook")) {
    media.mimetype = "audio";
  } else if (type === "telegram" || type === "facebook") {
    media.mimetype = "file";
  }
  return media;
};

export const SendMediaMessageService = async (
  media: Express.Multer.File,
  message: string,
  ticketId: number,
  contact: Contact,
  connection: any,
  companyIdOld: number,
  channelType: string // ← nuevo parámetro
) => {
  console.log("📡 Canal de envío detectado:", channelType);  // <--- Aquí está tu log
  const ticket = await Ticket.findOne({ where: { id: ticketId } });
  if (!ticket) {
    throw new Error("Ticket no encontrado");
  }

  const companyId = ticket.companyId;
  const notificameHubToken = await showHubToken(companyId);
  const client = new Client(notificameHubToken);

  let channelClient;
  let contactNumber;
  let type;
  let mediaUrl;

  if (contact.messengerId && !contact.instagramId) {
    contactNumber = contact.messengerId;
    type = "facebook";
    channelClient = client.setChannel(type);
  }
  if (!contact.messengerId && contact.instagramId) {
    contactNumber = contact.instagramId;
    type = "instagram";
    channelClient = client.setChannel(type);
  }

  // Limpieza del mensaje
  if (typeof message !== "string") {
    console.warn("⚠️ `message` no es una cadena:", message);
    message = typeof message === "object" ? JSON.stringify(message) : String(message);
  }
  message = message.replace(/\n/g, " ");
  const backendUrl = `${process.env.BACKEND_URL}`;
  const filename = encodeURIComponent(media.filename);
  mediaUrl = `${backendUrl}/public/company${companyId}/${filename}`;

  // Convertir vídeo MP4 a formato compatible si es necesario
  if (media.mimetype.includes("video") && (type === "facebook" || type === "instagram")) {
    try {
      const inputPath = media.path;
      const convertedFilename = await convertVideoToCompatibleFormat(inputPath, media.destination);
      media.filename = convertedFilename;
      mediaUrl = `${backendUrl}/public/company${companyId}/${convertedFilename}`;
      media.originalname = convertedFilename;
      media.mimetype = "video"; 
    } catch (error) {
      console.error(`Error al convertir vídeo para ${type}:`, error);
    }
  }

  // Convertir MP3 a MP4 para Instagram
  if (media.originalname.includes(".mp3") && type === "instagram") {
    const inputPath = media.path;
    const outputMP4Path = `${media.destination}/${media.filename.split(".")[0]}.mp4`;
    try {
      await convertMp3ToMp4(inputPath, outputMP4Path);
      media.filename = outputMP4Path.split("/").pop() ?? "default.mp4";
      mediaUrl = `${backendUrl}/public/company${companyId}/${media.filename}`;
      media.originalname = media.filename;
      media.mimetype = "audio";
    } catch (e) {
      console.error("Error al convertir MP3 para Instagram:", e);
    }
  }

  // Ajustar metadatos de medios según el tipo de canal
  media = adjustMediaMetadata(media, type);

  const content = new FileContent(
    mediaUrl,
    media.mimetype,
    media.originalname,
    media.originalname
  );

  console.log("CUERPO MSG HUB:: ",{
    token: connection.qrcode,
    number: contactNumber,
    content,
    message,
    companyId
  });

  try {
    // Enviar el mensaje usando el cliente de NotificameHub
    let response = await channelClient.sendMessage(
      connection.qrcode,
      contactNumber,
      content
    );
    // console.log("📬 RESPUESTA:: ", response);  // HUB DEPURACIÓN

    let data: any;
    try {
      const jsonStart = response.indexOf("{");
      const jsonResponse = response.substring(jsonStart);
      data = JSON.parse(jsonResponse);
    } catch (error) {
      data = response;
    }
    
    const newMessage = await CreateMessageService({
      id: data.id,
      contactId: contact.id,
      companyId,
      body: message,
      ticketId,
      fromMe: true,
      fileName: `${media.filename}`,
      mediaType: media.mimetype.split("/")[0],
      originalName: media.originalname
    });

    return newMessage;
  } catch (error) {
    console.error("ERROR HUB:: ", error);
    throw error;
  }
};
