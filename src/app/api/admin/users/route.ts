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
      groups: { select: { id: true } },
    },
  });

  return Response.json(
    users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      instagram: u.instagram,
      groupIds: u.groups.map((g) => g.id),
    }))
  );
}
