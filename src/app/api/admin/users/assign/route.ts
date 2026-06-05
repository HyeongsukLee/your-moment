import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";

// 관리자: 작가에게 행사 배정/해제
export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId, eventId, assigned } = await req.json();
  if (!userId || !eventId || typeof assigned !== "boolean") {
    return Response.json({ error: "Invalid params" }, { status: 400 });
  }

  // 작가만 배정 가능
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  if (user?.role !== "PHOTOGRAPHER") {
    return Response.json(
      { error: "작가에게만 행사를 배정할 수 있습니다" },
      { status: 400 }
    );
  }

  await db.event.update({
    where: { id: eventId },
    data: {
      photographers: assigned
        ? { connect: { id: userId } }
        : { disconnect: { id: userId } },
    },
  });

  return Response.json({ ok: true, eventId, userId, assigned });
}
