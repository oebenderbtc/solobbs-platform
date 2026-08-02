import { NextResponse } from "next/server";
import { createMathCaptcha } from "@/lib/simple-captcha";

export async function GET() {
  const challenge = createMathCaptcha();
  return NextResponse.json({
    token: challenge.token,
    question: challenge.question,
    a: challenge.a,
    b: challenge.b,
  });
}
