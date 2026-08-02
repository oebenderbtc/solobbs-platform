import { NextResponse } from "next/server";
import { z } from "zod";
import { issueTronNonce, isTronAddress } from "@/lib/tron-auth";
import { authenticateTronWallet } from "@/lib/tron-verify";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const action = body?.action;

    if (action === "nonce") {
      const address = String(body.address || "");
      if (!isTronAddress(address)) {
        return NextResponse.json({ error: "Dirección TRON inválida" }, { status: 400 });
      }
      const { nonce, message } = await issueTronNonce(address);
      return NextResponse.json({ nonce, message });
    }

    const schema = z.object({
      action: z.literal("verify").optional(),
      address: z.string().min(30),
      signature: z.string().min(10),
      nonce: z.string().min(8),
      message: z.string().min(10),
      name: z.string().optional(),
      role: z.enum(["MODEL", "CLIENT"]).optional(),
      referralCode: z.string().optional(),
      mode: z.enum(["login", "register"]).optional(),
    });

    const parsed = schema.parse(body);
    const result = await authenticateTronWallet(parsed);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({ user: result.user });
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }
}
