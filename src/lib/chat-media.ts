import { mkdir, writeFile, unlink, readFile } from "fs/promises";
import path from "path";

export type ChatMediaKind = "IMAGE" | "VIDEO" | "AUDIO" | "FILE";

const MAX = {
  IMAGE: 8 * 1024 * 1024,
  VIDEO: 40 * 1024 * 1024,
  AUDIO: 12 * 1024 * 1024,
  FILE: 15 * 1024 * 1024,
} as const;

export function uploadsRoot() {
  return (
    process.env.UPLOAD_ROOT ||
    path.join(process.cwd(), "data", "uploads")
  );
}

export function classifyChatFile(file: File): {
  kind: ChatMediaKind;
  ext: string;
  maxBytes: number;
} | null {
  const name = (file.name || "upload").toLowerCase();
  const type = (file.type || "").toLowerCase();

  // Camera / gallery blobs sometimes omit MIME; treat common image extensions as images
  const looksImage =
    type.startsWith("image/") ||
    /\.(jpe?g|png|webp|gif|heic|heif|bmp)$/i.test(name);

  if (looksImage) {
    let ext = "jpg";
    if (type.includes("png") || name.endsWith(".png")) ext = "png";
    else if (type.includes("webp") || name.endsWith(".webp")) ext = "webp";
    else if (type.includes("gif") || name.endsWith(".gif")) ext = "gif";
    else if (type.includes("heic") || name.endsWith(".heic")) ext = "heic";
    else if (type.includes("heif") || name.endsWith(".heif")) ext = "heif";
    return { kind: "IMAGE", ext, maxBytes: MAX.IMAGE };
  }

  if (type.startsWith("audio/")) {
    let ext = "webm";
    if (type.includes("mpeg") || name.endsWith(".mp3")) ext = "mp3";
    else if (type.includes("ogg") || name.endsWith(".ogg")) ext = "ogg";
    else if (type.includes("mp4") || name.endsWith(".m4a")) ext = "m4a";
    else if (name.endsWith(".wav") || type.includes("wav")) ext = "wav";
    else if (type.includes("webm") || name.endsWith(".webm")) ext = "webm";
    return { kind: "AUDIO", ext, maxBytes: MAX.AUDIO };
  }

  if (
    type.startsWith("video/") ||
    ((name.endsWith(".mp4") || name.endsWith(".mov") || name.endsWith(".webm")) &&
      !type.startsWith("audio/"))
  ) {
    const ext =
      type.includes("webm") || name.endsWith(".webm")
        ? "webm"
        : name.endsWith(".mov") || type.includes("quicktime")
          ? "mov"
          : "mp4";
    return { kind: "VIDEO", ext, maxBytes: MAX.VIDEO };
  }

  const safe =
    name.match(/\.([a-z0-9]{1,8})$/)?.[1] ||
    (type.includes("pdf") ? "pdf" : "bin");
  return { kind: "FILE", ext: safe, maxBytes: MAX.FILE };
}

export function chatFileDiskPath(
  userId: string,
  inquiryId: string,
  filename: string,
) {
  return path.join(uploadsRoot(), "chat", userId, inquiryId, filename);
}

export async function saveChatUpload(
  userId: string,
  inquiryId: string,
  file: File,
  _kind: ChatMediaKind,
  ext: string,
) {
  const dir = path.join(uploadsRoot(), "chat", userId, inquiryId);
  await mkdir(dir, { recursive: true });
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.length === 0) {
    throw new Error("Archivo vacío");
  }
  await writeFile(path.join(dir, filename), buffer);
  // Served by /api/media/... (not public/) so it works on Render
  return `/api/media/chat/${userId}/${inquiryId}/${filename}`;
}

export async function deleteChatUpload(url: string | null | undefined) {
  if (!url) return;
  const match = url.match(
    /^\/api\/media\/chat\/([^/]+)\/([^/]+)\/([^/]+)$/,
  );
  // Legacy public paths
  if (url.startsWith("/uploads/chat/")) {
    try {
      await unlink(path.join(process.cwd(), "public", url.replace(/^\//, "")));
    } catch {
      /* ignore */
    }
    return;
  }
  if (!match) return;
  const [, userId, inquiryId, filename] = match;
  try {
    await unlink(chatFileDiskPath(userId, inquiryId, filename));
  } catch {
    /* ignore */
  }
}

export async function readChatUpload(url: string) {
  const match = url.match(
    /^\/api\/media\/chat\/([^/]+)\/([^/]+)\/([^/]+)$/,
  );
  if (!match) return null;
  const [, userId, inquiryId, filename] = match;
  const disk = chatFileDiskPath(userId, inquiryId, filename);
  return readFile(disk);
}

export function mimeFromExt(filename: string) {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  const map: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    gif: "image/gif",
    heic: "image/heic",
    heif: "image/heif",
    mp4: "video/mp4",
    webm: "video/webm",
    mov: "video/quicktime",
    mp3: "audio/mpeg",
    m4a: "audio/mp4",
    ogg: "audio/ogg",
    wav: "audio/wav",
    pdf: "application/pdf",
  };
  return map[ext] || "application/octet-stream";
}
