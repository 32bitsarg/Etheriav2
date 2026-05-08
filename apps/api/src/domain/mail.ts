import { SendMailMessageRequestSchema } from "@etheria/shared";
import { db, COLLECTIONS } from "../infrastructure/matecito.js";
import { getUserProfile } from "./alliances.js";

const genId = () => crypto.randomUUID();

export async function sendMailMessage(input: {
  senderUserId: string;
  recipientCityId: string;
  subject: string;
  body: string;
}) {
  const data = SendMailMessageRequestSchema.parse({
    recipientCityId: input.recipientCityId,
    subject: input.subject,
    body: input.body,
  });

  const [sender, recipientCityRes] = await Promise.all([
    getUserProfile(input.senderUserId),
    db.from(COLLECTIONS.CITIES).eq("id", data.recipientCityId).getFirst() as any,
  ]);

  const recipientCity = recipientCityRes.data;
  if (!recipientCity) return { error: "Recipient city not found" as const };
  if (recipientCity.userId === input.senderUserId) return { error: "Cannot send mail to yourself" as const };

  const recipient = await getUserProfile(recipientCity.userId);
  const nowIso = new Date().toISOString();
  const message = {
    id: genId(),
    senderUserId: input.senderUserId,
    senderName: sender?.name?.trim() || sender?.email?.split("@")[0] || "Commander",
    recipientUserId: recipientCity.userId,
    recipientName: recipient?.name?.trim() || recipient?.email?.split("@")[0] || recipientCity.name || "Commander",
    recipientCityId: recipientCity.id,
    recipientCityName: recipientCity.name,
    subject: data.subject,
    body: data.body,
    readAt: null,
    createdAt: nowIso,
  };

  await db.from(COLLECTIONS.MAIL_MESSAGES).insert(message);
  return { message };
}
