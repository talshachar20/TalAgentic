import { NextRequest } from "next/server";
import { destroySession } from "@/lib/auth-store";

export async function POST(req: NextRequest) {
  const token = req.cookies.get("cs_session")?.value;
  if (token) destroySession(token);

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": "cs_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0",
    },
  });
}
