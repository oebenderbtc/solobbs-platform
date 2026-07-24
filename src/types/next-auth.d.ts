import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      referralCode: string;
    } & DefaultSession["user"];
  }

  interface User {
    role?: string;
    referralCode?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
    referralCode?: string;
  }
}
