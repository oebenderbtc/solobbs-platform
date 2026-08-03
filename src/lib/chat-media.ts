export type ChatMediaKind = "IMAGE" | "VIDEO" | "AUDIO" | "FILE";

const MAX = {
  IMAGE: 6 * 1024 * 1024,
  VIDEO: 20 * 1024 * 1024,
  AUDIO: 10 * 1024 * 1024,
  FILE: 12 * 1024 * 1024,
} as const;

export function classifyChatFile(file: File): {
  kind: ChatMediaKind;
  ext: string;
  maxBytes: number;
  mime: string;
} | null {
  const name = (file.name || "upload").toLowerCase();
  const type = (file.type || "").toLowerCase();

  const looksImage =
    type.startsWith("image/") ||
    /\.(jpe?g|png|webp|gif|heic|heif|bmp)$/i.test(name);

  if (looksImage) {
    let ext = "jpg";
    let mime = type.startsWith("image/") ? type : "image/jpeg";
    if (type.includes("png") || name.endsWith(".png")) {
      ext = "png";
      mime = "image/png";
    } else if (type.includes("webp") || name.endsWith(".webp")) {
      ext = "webp";
      mime = "image/webp";
    } else if (type.includes("gif") || name.endsWith(".gif")) {
      ext = "gif";
      mime = "image/gif";
    } else if (type.includes("heic") || name.endsWith(".heic")) {
      ext = "heic";
      mime = "image/heic";
    } else if (type.includes("heif") || name.endsWith(".heif")) {
      ext = "heif";
      mime = "image/heif";
    }
    return { kind: "IMAGE", ext, maxBytes: MAX.IMAGE, mime };
  }

  if (type.startsWith("audio/")) {
    let ext = "webm";
    let mime = type || "audio/webm";
    if (type.includes("mpeg") || name.endsWith(".mp3")) {
      ext = "mp3";
      mime = "audio/mpeg";
    } else if (type.includes("ogg") || name.endsWith(".ogg")) {
      ext = "ogg";
      mime = "audio/ogg";
    } else if (type.includes("mp4") || name.endsWith(".m4a")) {
      ext = "m4a";
      mime = "audio/mp4";
    } else if (name.endsWith(".wav") || type.includes("wav")) {
      ext = "wav";
      mime = "audio/wav";
    }
    return { kind: "AUDIO", ext, maxBytes: MAX.AUDIO, mime };
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
    const mime =
      type.startsWith("video/")
        ? type
        : ext === "webm"
          ? "video/webm"
          : ext === "mov"
            ? "video/quicktime"
            : "video/mp4";
    return { kind: "VIDEO", ext, maxBytes: MAX.VIDEO, mime };
  }

  const safe =
    name.match(/\.([a-z0-9]{1,8})$/)?.[1] ||
    (type.includes("pdf") ? "pdf" : "bin");
  return {
    kind: "FILE",
    ext: safe,
    maxBytes: MAX.FILE,
    mime: type || "application/octet-stream",
  };
}

export async function fileToBuffer(file: File) {
  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.length === 0) throw new Error("Archivo vacío");
  return buffer;
}

export function mediaUrlForMessage(messageId: string) {
  return `/api/media/msg/${messageId}`;
}
