import { NextRequest } from "next/server";
import { authenticateUser, createSession } from "@/lib/auth-store";

export async function POST(req: NextRequest) {
  let email: string, password: string;
  try {
    ({ email, password } = await req.json());
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!email || !password) {
    return Response.json(
      { error: "Email and password are required" },
      { status: 400 }
    );
  }

  const user = await authenticateUser(email, password);
  if (!user) {
    return Response.json(
      { error: "Invalid email or password" },
      { status: 401 }
    );
  }

  const token = createSession(user.email);

  return new Response(
    JSON.stringify({ name: user.name, email: user.email }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": `cs_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`,
      },
    }
  );
}
