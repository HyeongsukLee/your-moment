import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";

// 관리자: 유저 목록 + 역할 + 배정된 행사 id
export async function GET() {
  const session = await requireAdmin();
  if (!session) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const users = await db.user.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      instagram: true,
      createdAt: true,
      groups: { select: { id: true, name: true } },
    },
  });

  const ROLE_ORDER: Record<string, number> = { ADMIN: 0, PHOTOGRAPHER: 1, PARTICIPANT: 2 };
  users.sort((a, b) => (ROLE_ORDER[a.role] ?? 9) - (ROLE_ORDER[b.role] ?? 9));

  return Response.json(
    users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      instagram: u.instagram,
      createdAt: u.createdAt,
      groupIds: u.groups.map((g) => g.id),
    }))
  );
}
