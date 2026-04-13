import { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth-store";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("cs_session")?.value;
  if (!token) {
    return Response.json({ user: null });
  }
  const user = await getSessionUser(token);
  return Response.json({ user: user ?? null });
}
