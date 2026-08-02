import { NextResponse } from "next/server";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const STORY_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_ACTIVE = 12;

function mediaFromFile(file: File) {
  if (file.type.startsWith("image/")) {
    const ext = file.type.includes("png")
      ? "png"
      : file.type.includes("webp")
        ? "webp"
        : "jpg";
    return { mediaType: "IMAGE" as const, ext, maxBytes: 6 * 1024 * 1024 };
  }
  if (file.type === "video/mp4" || file.type === "video/webm") {
    const ext = file.type.includes("webm") ? "webm" : "mp4";
    return { mediaType: "VIDEO" as const, ext, maxBytes: 25 * 1024 * 1024 };
  }
  return null;
}

async function purgeExpired(modelId?: string) {
  await prisma.story.deleteMany({
    where: {
      expiresAt: { lt: new Date() },
      ...(modelId ? { modelId } : {}),
    },
  });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const modelCode = searchParams.get("modelCode");
  const modelId = searchParams.get("modelId");

  // Public: active stories for a model
  if (modelCode || modelId) {
    const model = modelId
      ? await prisma.user.findFirst({
          where: { id: modelId, role: "MODEL", isActive: true, galleryPublic: true },
        })
      : await prisma.user.findFirst({
          where: {
            referralCode: (modelCode || "").toUpperCase(),
            role: "MODEL",
            isActive: true,
            galleryPublic: true,
          },
        });
    if (!model) {
      return NextResponse.json({ error: "No encontrada" }, { status: 404 });
    }
    await purgeExpired(model.id);
    const stories = await prisma.story.findMany({
      where: { modelId: model.id, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({
      stories,
      model: {
        id: model.id,
        name: model.name,
        avatarUrl: model.avatarUrl,
        referralCode: model.referralCode,
      },
    });
  }

  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  await purgeExpired(session.user.id);
  const stories = await prisma.story.findMany({
    where: { modelId: session.user.id, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ stories });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "MODEL") {
    return NextResponse.json({ error: "Solo modelos" }, { status: 403 });
  }

  await purgeExpired(session.user.id);

  const active = await prisma.story.count({
    where: { modelId: session.user.id, expiresAt: { gt: new Date() } },
  });
  if (active >= MAX_ACTIVE) {
    return NextResponse.json(
      { error: `Máximo ${MAX_ACTIVE} estados activos` },
      { status: 400 },
    );
  }

  const form = await req.formData();
  const file = form.get("file");
  const caption = String(form.get("caption") || "").slice(0, 120);

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Archivo requerido" }, { status: 400 });
  }

  const media = mediaFromFile(file);
  if (!media) {
    return NextResponse.json(
      { error: "Solo foto o video (mp4/webm) para estados" },
      { status: 400 },
    );
  }
  if (file.size > media.maxBytes) {
    return NextResponse.json(
      {
        error:
          media.mediaType === "VIDEO"
            ? "Video de estado máximo 25MB"
            : "Imagen máximo 6MB",
      },
      { status: 400 },
    );
  }

  const dir = path.join(
    process.cwd(),
    "public",
    "uploads",
    "stories",
    session.user.id,
  );
  await mkdir(dir, { recursive: true });
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${media.ext}`;
  await writeFile(
    path.join(dir, filename),
    Buffer.from(await file.arrayBuffer()),
  );

  const story = await prisma.story.create({
    data: {
      modelId: session.user.id,
      url: `/uploads/stories/${session.user.id}/${filename}`,
      mediaType: media.mediaType,
      caption: caption || null,
      expiresAt: new Date(Date.now() + STORY_TTL_MS),
    },
  });

  return NextResponse.json({ story });
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "MODEL") {
    return NextResponse.json({ error: "Solo modelos" }, { status: 403 });
  }

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

  const existing = await prisma.story.findFirst({
    where: { id, modelId: session.user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  await prisma.story.delete({ where: { id } });
  if (existing.url.startsWith("/uploads/")) {
    await unlink(
      path.join(process.cwd(), "public", existing.url.replace(/^\//, "")),
    ).catch(() => undefined);
  }

  return NextResponse.json({ ok: true });
}
