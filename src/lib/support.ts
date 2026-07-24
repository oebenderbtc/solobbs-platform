import { prisma } from "@/lib/prisma";
import { matchFaq, listFaqTopics, SUPPORT_FAQ } from "@/lib/support-faq";

export { matchFaq, listFaqTopics, SUPPORT_FAQ };

export function autoReply(message: string) {
  return matchFaq(message);
}

export async function ensureWelcome(conversationId: string) {
  const count = await prisma.supportMessage.count({ where: { conversationId } });
  if (count > 0) return;
  await prisma.supportMessage.create({
    data: {
      conversationId,
      sender: "SUPPORT",
      body: "Hola, soy el asistente de SoloBBs. Tengo respuestas listas sobre escrow, pagos, billetera, red, cuenta y panel. Pregúntame o elige un tema rápido. Solo te paso con un agente si no tengo respuesta predefinida.",
    },
  });
}
