import AppError from "../errors/AppError";
import Whatsapp from "../models/Whatsapp";
import GetDefaultWhatsAppByUser from "./GetDefaultWhatsAppByUser";

const GetDefaultWhatsApp = async (
  companyId: number,
  userId?: number
): Promise<Whatsapp> => {
  let connection: Whatsapp | null = null;

  const defaultWhatsapp = await Whatsapp.findOne({
    where: { isDefault: true, companyId, type: "Whatsapp" } // ✅ Asegura que sea WhatsApp
  });

  if (defaultWhatsapp?.status === "CONNECTED") {
    connection = defaultWhatsapp;
  } else {
    const whatsapp = await Whatsapp.findOne({
      where: { status: "CONNECTED", companyId, type: "Whatsapp" } // ✅ Solo WhatsApp
    });
    connection = whatsapp;
  }

  if (userId) {
    const whatsappByUser = await GetDefaultWhatsAppByUser(userId);
    if (whatsappByUser?.status === "CONNECTED" && whatsappByUser.type === "Whatsapp") {
      connection = whatsappByUser;
    } else {
      const whatsapp = await Whatsapp.findOne({
        where: { status: "CONNECTED", companyId, type: "Whatsapp" } // ✅ Solo WhatsApp
      });
      connection = whatsapp;
    }
  }

  if (!connection) {
    throw new AppError(`ERR_NO_DEF_WAPP_FOUND in COMPANY ${companyId}`);
  }

  return connection;
};

export default GetDefaultWhatsApp;
