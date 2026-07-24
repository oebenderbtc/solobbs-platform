import { NextResponse } from "next/server";
import { listFaqTopics, SUPPORT_FAQ } from "@/lib/support-faq";

export async function GET() {
  return NextResponse.json({
    topics: listFaqTopics(),
    faqs: SUPPORT_FAQ.map((f) => ({
      id: f.id,
      question: f.question,
      reply: f.reply,
    })),
  });
}
