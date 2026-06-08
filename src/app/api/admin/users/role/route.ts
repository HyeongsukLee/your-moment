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

  const before = await db.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  const updated = await db.user.update({
    where: { id: userId },
    data: {
      role,
      // 작가에서 해제되면 행사 배정도 모두 해제
      ...(role !== "PHOTOGRAPHER" ? { assignedEvents: { set: [] } } : {}),
    },
    select: { id: true, role: true },
  });

  // 알림 ② ROLE_CHANGED: 역할이 실제로 바뀐 경우에만
  if (before && before.role !== role) {
    const title =
      role === "PHOTOGRAPHER"
        ? "작가로 등록됐어요 · 이제 사진을 올릴 수 있어요"
        : role === "ADMIN"
          ? "관리자 권한이 부여됐어요"
          : "역할이 참가자로 변경됐어요";
    await db.notification.create({
      data: { userId, type: "ROLE_CHANGED", title },
    });
  }

  return Response.json(updated);
}
