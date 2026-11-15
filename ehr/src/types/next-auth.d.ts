import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      patientId?: string;
    } & DefaultSession["user"];
  }

  interface User {
    role?: string;
    patientId?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    id?: string;
    patientId?: string;
  }
}
