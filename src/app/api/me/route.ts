import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = session.user.role ?? "PARTICIPANT";
  return Response.json({
    id: session.user.id,
    name: session.user.name ?? null,
    email: session.user.email ?? null,
    role,
    isAdmin: role === "ADMIN",
    isStaff: role === "ADMIN" || role === "PHOTOGRAPHER",
  });
}
