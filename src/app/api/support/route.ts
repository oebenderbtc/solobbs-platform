import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { autoReply, ensureWelcome } from "@/lib/support";

function visitorCookie(req: Request) {
  const cookie = req.headers.get("cookie") || "";
  const match = cookie.match(/solobbs_support_vid=([^;]+)/);
  return match?.[1];
}

export async function GET(req: Request) {
  const session = await auth();
  const { searchParams } = new URL(req.url);
  const conversationId = searchParams.get("conversationId");
  const visitorId = visitorCookie(req);

  if (session?.user?.role === "ADMIN" && !conversationId) {
    const conversations = await prisma.supportConversation.findMany({
      include: {
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
        user: { select: { name: true, email: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 50,
    });
    return NextResponse.json({ conversations });
  }

  if (!conversationId) {
    return NextResponse.json({ messages: [], conversationId: null });
  }

  const conversation = await prisma.supportConversation.findUnique({
    where: { id: conversationId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });

  if (!conversation) {
    return NextResponse.json({ error: "Conversación no encontrada" }, { status: 404 });
  }

  const canRead =
    session?.user?.role === "ADMIN" ||
    conversation.visitorId === visitorId ||
    (session?.user && conversation.userId === session.user.id);

  if (!canRead) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  return NextResponse.json({
    conversationId: conversation.id,
    status: conversation.status,
    messages: conversation.messages,
  });
}

const postSchema = z.object({
  conversationId: z.string().optional(),
  visitorId: z.string().min(8).optional(),
  name: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  body: z.string().min(1).max(2000),
  asAdmin: z.boolean().optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  const data = postSchema.parse(await req.json());

  let visitorId = data.visitorId || visitorCookie(req);
  if (!visitorId) {
    visitorId = `v_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
  }

  let conversation =
    data.conversationId
      ? await prisma.supportConversation.findUnique({ where: { id: data.conversationId } })
      : null;

  if (!conversation) {
    conversation = await prisma.supportConversation.create({
      data: {
        visitorId,
        visitorName: data.name || session?.user?.name || null,
        visitorEmail: data.email || session?.user?.email || null,
        userId: session?.user?.id || null,
      },
    });
    await ensureWelcome(conversation.id);
  }

  const isAdminReply = Boolean(data.asAdmin && session?.user?.role === "ADMIN");

  if (!isAdminReply) {
    const canWrite =
      conversation.visitorId === visitorId ||
      (session?.user && conversation.userId === session.user.id);
    if (!canWrite && session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
    }
  }

  const userMessage = await prisma.supportMessage.create({
    data: {
      conversationId: conversation.id,
      sender: isAdminReply ? "SUPPORT" : "USER",
      body: data.body.trim(),
    },
  });

  await prisma.supportConversation.update({
    where: { id: conversation.id },
    data: {
      updatedAt: new Date(),
      visitorName: data.name || conversation.visitorName,
      visitorEmail: data.email || conversation.visitorEmail,
      userId: conversation.userId || session?.user?.id || null,
      status: isAdminReply ? "OPEN" : conversation.status,
    },
  });

  let botMessage = null;
  let matched = true;
  let needsAgent = false;

  if (!isAdminReply) {
    const result = autoReply(data.body);
    matched = result.matched;
    needsAgent = result.needsAgent;
    botMessage = await prisma.supportMessage.create({
      data: {
        conversationId: conversation.id,
        sender: "SUPPORT",
        body: result.reply,
      },
    });

    await prisma.supportConversation.update({
      where: { id: conversation.id },
      data: {
        status: needsAgent ? "NEEDS_AGENT" : "OPEN",
        updatedAt: new Date(),
      },
    });
  } else {
    await prisma.supportConversation.update({
      where: { id: conversation.id },
      data: { status: "OPEN", updatedAt: new Date() },
    });
  }

  const messages = await prisma.supportMessage.findMany({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: "asc" },
  });

  const res = NextResponse.json({
    conversationId: conversation.id,
    visitorId,
    messages,
    lastUserMessage: userMessage,
    botMessage,
    matched,
    needsAgent,
  });

  res.headers.set(
    "Set-Cookie",
    `solobbs_support_vid=${visitorId}; Path=/; Max-Age=31536000; SameSite=Lax`,
  );

  return res;
}
