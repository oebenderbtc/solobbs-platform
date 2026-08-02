import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "./prisma";
import { authenticateTronWallet } from "./tron-verify";
import { verifyMathCaptcha } from "./simple-captcha";

const emailSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  captchaToken: z.string().min(8),
  captchaAnswer: z.string().min(1),
});

const emptyToUndef = (v: unknown) => {
  if (typeof v !== "string") return v;
  const t = v.trim();
  if (!t || t === "undefined" || t === "null") return undefined;
  return t;
};

const tronSchema = z.object({
  tronAddress: z.string().min(30),
  signature: z.string().min(10),
  nonce: z.string().min(8),
  message: z.string().min(10),
  name: z.preprocess(emptyToUndef, z.string().optional()),
  role: z.preprocess(emptyToUndef, z.enum(["MODEL", "CLIENT"]).optional()),
  referralCode: z.preprocess(emptyToUndef, z.string().optional()),
  mode: z.preprocess(emptyToUndef, z.enum(["login", "register"]).optional()),
  captchaToken: z.string().min(8),
  captchaAnswer: z.string().min(1),
});

class TronAuthError extends CredentialsSignin {
  constructor(message: string) {
    super(message);
    this.code = message;
  }
}

function requireCaptcha(token: unknown, answer: unknown) {
  const check = verifyMathCaptcha(
    typeof token === "string" ? token : null,
    typeof answer === "string" || typeof answer === "number" ? answer : null,
  );
  if (!check.ok) throw new TronAuthError(check.error);
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      id: "credentials",
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        tronAddress: { label: "Tron", type: "text" },
        signature: { label: "Signature", type: "text" },
        nonce: { label: "Nonce", type: "text" },
        message: { label: "Message", type: "text" },
        name: { label: "Name", type: "text" },
        role: { label: "Role", type: "text" },
        referralCode: { label: "Referral", type: "text" },
        mode: { label: "Mode", type: "text" },
        captchaToken: { label: "Captcha token", type: "text" },
        captchaAnswer: { label: "Captcha answer", type: "text" },
      },
      async authorize(raw) {
        // TronLink / wallet TRON
        if (raw?.tronAddress && raw?.signature && raw?.nonce && raw?.message) {
          requireCaptcha(raw.captchaToken, raw.captchaAnswer);
          const parsed = tronSchema.safeParse(raw);
          if (!parsed.success) {
            throw new TronAuthError("Datos de wallet inválidos");
          }
          const { tronAddress, captchaToken: _t, captchaAnswer: _a, ...rest } =
            parsed.data;
          const result = await authenticateTronWallet({
            address: tronAddress,
            ...rest,
          });
          if ("error" in result) {
            throw new TronAuthError(result.error || "Error de autenticación TRON");
          }
          return {
            id: result.user.id,
            email: result.user.email,
            name: result.user.name,
            role: result.user.role,
            referralCode: result.user.referralCode,
          };
        }

        const parsed = emailSchema.safeParse(raw);
        if (!parsed.success) return null;

        const captcha = verifyMathCaptcha(
          parsed.data.captchaToken,
          parsed.data.captchaAnswer,
        );
        if (!captcha.ok) throw new TronAuthError(captcha.error);

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email.toLowerCase() },
        });
        if (!user || !user.isActive || !user.passwordHash) return null;

        const valid = await bcrypt.compare(
          parsed.data.password,
          user.passwordHash,
        );
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          referralCode: user.referralCode,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.role = (user as { role?: string }).role;
        token.referralCode = (user as { referralCode?: string }).referralCode;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.referralCode = token.referralCode as string;
      }
      return session;
    },
  },
});
