import { auth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  return Response.json({
    name: session.user.name ?? null,
    email: session.user.email ?? null,
    isAdmin: isAdminEmail(session.user.email),
  });
}
