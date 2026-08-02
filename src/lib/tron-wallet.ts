import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { TronWeb } from "tronweb";

function encKey() {
  const secret = process.env.WALLET_ENC_KEY || process.env.AUTH_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "WALLET_ENC_KEY o AUTH_SECRET requerido para cifrar wallets en producción",
      );
    }
    return createHash("sha256").update("solobbs-dev-wallet-key").digest();
  }
  return createHash("sha256").update(secret).digest();
}

/** AES-256-GCM encrypt private key for DB storage */
export function encryptTronPrivateKey(privateKey: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encKey(), iv);
  const enc = Buffer.concat([cipher.update(privateKey, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${enc.toString("hex")}`;
}

export function decryptTronPrivateKey(payload: string) {
  const [ivHex, tagHex, dataHex] = payload.split(":");
  if (!ivHex || !tagHex || !dataHex) {
    throw new Error("Clave custodial inválida");
  }
  const decipher = createDecipheriv(
    "aes-256-gcm",
    encKey(),
    Buffer.from(ivHex, "hex"),
  );
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  const dec = Buffer.concat([
    decipher.update(Buffer.from(dataHex, "hex")),
    decipher.final(),
  ]);
  return dec.toString("utf8");
}

export type GeneratedTronWallet = {
  address: string;
  privateKeyEnc: string;
};

/** Offline TRON keypair — not activated on-chain until it receives TRX/USDT */
export async function generateCustodialTronWallet(): Promise<GeneratedTronWallet> {
  const account = await TronWeb.createAccount();
  const address = account.address?.base58;
  const privateKey = account.privateKey;
  if (!address || !privateKey) {
    throw new Error("No se pudo generar wallet TRON");
  }
  return {
    address,
    privateKeyEnc: encryptTronPrivateKey(privateKey),
  };
}
