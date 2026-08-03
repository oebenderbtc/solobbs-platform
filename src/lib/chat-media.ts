import { mkdir, writeFile, unlink } from "fs/promises";
import path from "path";

export type ChatMediaKind = "IMAGE" | "VIDEO" | "AUDIO" | "FILE";

const MAX = {
  IMAGE: 8 * 1024 * 1024,
  VIDEO: 40 * 1024 * 1024,
  AUDIO: 12 * 1024 * 1024,
  FILE: 15 * 1024 * 1024,
} as const;

export function classifyChatFile(file: File): {
  kind: ChatMediaKind;
  ext: string;
  maxBytes: number;
} | null {
  const name = file.name.toLowerCase();
  if (file.type.startsWith("image/")) {
    const ext = file.type.includes("png")
      ? "png"
      : file.type.includes("webp")
        ? "webp"
        : file.type.includes("gif")
          ? "gif"
          : "jpg";
    return { kind: "IMAGE", ext, maxBytes: MAX.IMAGE };
  }
  if (file.type.startsWith("audio/")) {
    let ext = "webm";
    if (file.type.includes("mpeg") || name.endsWith(".mp3")) ext = "mp3";
    else if (file.type.includes("ogg") || name.endsWith(".ogg")) ext = "ogg";
    else if (file.type.includes("mp4") || name.endsWith(".m4a")) ext = "m4a";
    else if (name.endsWith(".wav") || file.type.includes("wav")) ext = "wav";
    else if (file.type.includes("webm") || name.endsWith(".webm")) ext = "webm";
    return { kind: "AUDIO", ext, maxBytes: MAX.AUDIO };
  }
  if (
    file.type.startsWith("video/") ||
    ((name.endsWith(".mp4") || name.endsWith(".mov") || name.endsWith(".webm")) &&
      !file.type.startsWith("audio/"))
  ) {
    const ext = file.type.includes("webm") || name.endsWith(".webm")
      ? "webm"
      : name.endsWith(".mov") || file.type.includes("quicktime")
        ? "mov"
        : "mp4";
    return { kind: "VIDEO", ext, maxBytes: MAX.VIDEO };
  }

  // Generic documents
  const safe =
    name.match(/\.([a-z0-9]{1,8})$/)?.[1] ||
    (file.type.includes("pdf") ? "pdf" : "bin");
  return { kind: "FILE", ext: safe, maxBytes: MAX.FILE };
}

export async function saveChatUpload(
  userId: string,
  inquiryId: string,
  file: File,
  kind: ChatMediaKind,
  ext: string,
) {
  const dir = path.join(
    process.cwd(),
    "public",
    "uploads",
    "chat",
    userId,
    inquiryId,
  );
  await mkdir(dir, { recursive: true });
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, filename), buffer);
  return `/uploads/chat/${userId}/${inquiryId}/${filename}`;
}

export async function deleteChatUpload(url: string | null | undefined) {
  if (!url || !url.startsWith("/uploads/chat/")) return;
  try {
    await unlink(path.join(process.cwd(), "public", url.replace(/^\//, "")));
  } catch {
    // ignore missing file
  }
}
