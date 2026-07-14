import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import type { Role } from "@prisma/client";

const secretKey = process.env.JWT_SECRET || "default_secret_key_change_me_in_production_123456";
const encodedKey = new TextEncoder().encode(secretKey);

export type SessionPayload = {
  id: string;
  email: string;
  nama_lengkap: string;
  asal_cabang: string;
  role: Role;
};

export async function encrypt(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1d")
    .sign(encodedKey);
}

export async function decrypt(session: string | undefined = "") {
  try {
    const { payload } = await jwtVerify(session, encodedKey, {
      algorithms: ["HS256"],
    });
    return payload as SessionPayload;
  } catch (error) {
    return null;
  }
}

export async function getSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get("mbg_session")?.value;
  if (!session) return null;
  return await decrypt(session);
}
