import { NextRequest } from "next/server";
import { registerUser, createSession } from "@/lib/auth-store";

export async function POST(req: NextRequest) {
  let email: string, password: string, name: string;
  try {
    ({ email, password, name } = await req.json());
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!email || !password || !name) {
    return Response.json(
      { error: "Name, email, and password are required" },
      { status: 400 }
    );
  }

  if (password.length < 8) {
    return Response.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 }
    );
  }

  try {
    await registerUser(email, password, name);
  } catch (err) {
    if (err instanceof Error && err.message === "EMAIL_TAKEN") {
      return Response.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }
    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }

  const token = createSession(email);

  return new Response(JSON.stringify({ success: true }), {
    status: 201,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": `cs_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`,
    },
  });
}
