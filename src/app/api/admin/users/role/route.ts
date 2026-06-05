import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";

const VALID = ["PARTICIPANT", "PHOTOGRAPHER", "ADMIN"] as const;

// 관리자: 유저 역할 변경 (작가 지정/해제)
export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId, role } = await req.json();
  if (!userId || !VALID.includes(role)) {
    return Response.json({ error: "Invalid params" }, { status: 400 });
  }

  // 자기 자신의 ADMIN 권한은 못 내리게 (실수 방지)
  if (userId === session.user.id && role !== "ADMIN") {
    return Response.json(
      { error: "본인 관리자 권한은 변경할 수 없습니다" },
      { status: 400 }
    );
  }

  const updated = await db.user.update({
    where: { id: userId },
    data: {
      role,
      // 작가에서 해제되면 행사 배정도 모두 해제
      ...(role !== "PHOTOGRAPHER" ? { assignedEvents: { set: [] } } : {}),
    },
    select: { id: true, role: true },
  });

  return Response.json(updated);
}
