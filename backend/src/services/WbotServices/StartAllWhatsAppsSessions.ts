import { setChannelWebhook } from "../../helpers/setChannelHubWebhook";
import ListWhatsAppsService from "../WhatsappService/ListWhatsAppsService";
import { StartWhatsAppSession } from "./StartWhatsAppSession";
import * as Sentry from "@sentry/node";

export const StartAllWhatsAppsSessions = async (
  companyId: number
): Promise<void> => {
  try {
    const whatsapps = await ListWhatsAppsService({ companyId });
    if (whatsapps.length > 0) {
      whatsapps.forEach(whatsapp => {
         // PARCHE 1.3 - HUB
        if(whatsapp.type !== "Whatsapp") {
          setChannelWebhook(whatsapp, whatsapp.id.toString());
        } else {
          StartWhatsAppSession(whatsapp, companyId);
        }
         // PARCHE 1.3 - HUB FIN
      });
    }
  } catch (e) {
    Sentry.captureException(e);
  }
};
