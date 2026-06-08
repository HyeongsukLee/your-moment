import { requireStaff, requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { generateCode } from "@/lib/code";

// 운영진: 순간(행사) 목록 조회 — 관리자는 전체, 작가는 배정된 행사만
// ?all=1 이면 isActive 관계없이 전체 반환 (관리자 전용)
export async function GET(req: Request) {
  const session = await requireStaff();
  if (!session) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const isAdmin = session.user.role === "ADMIN";
  const showAll = isAdmin && new URL(req.url).searchParams.get("all") === "1";

  const events = await db.event.findMany({
    where: isAdmin
      ? showAll ? {} : { isActive: true }
      : { group: { members: { some: { id: session.user.id } } } },
    orderBy: { date: "desc" },
    select: {
      id: true,
      name: true,
      date: true,
      isActive: true,
      code: true,
      groupId: true,
      group: { select: { name: true } },
      _count: { select: { photos: true } },
    },
  });

  return Response.json(
    events.map((e) => ({
      id: e.id,
      name: e.name,
      date: e.date.toISOString(),
      isActive: e.isActive,
      code: e.code,
      groupId: e.groupId,
      groupName: e.group?.name ?? null,
      photoCount: e._count.photos,
    }))
  );
}

// 관리자 전용: 새 순간(행사) 생성
export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { name, date, description, groupId } = await req.json();
  if (!name || !date) {
    return Response.json({ error: "name과 date는 필수입니다" }, { status: 400 });
  }

  const event = await db.event.create({
    data: {
      name,
      date: new Date(date),
      description: description || null,
      isActive: true,
      ownerId: session.user.id,
      groupId: groupId || null,
      code: generateCode(),
    },
    select: { id: true, name: true, date: true, code: true, groupId: true },
  });

  // 알림 ④ NEW_EVENT: 그룹 멤버에게 "새 행사가 열렸어요"
  if (event.groupId) {
    const group = await db.group.findUnique({
      where: { id: event.groupId },
      select: { name: true, members: { select: { id: true } } },
    });
    if (group && group.members.length > 0) {
      await db.notification.createMany({
        data: group.members.map((m) => ({
          userId: m.id,
          type: "NEW_EVENT",
          title: `${group.name} 그룹에 새 행사가 열렸어요`,
          body: event.name,
          eventId: event.id,
        })),
      });
    }
  }

  return Response.json({
    id: event.id,
    name: event.name,
    date: event.date.toISOString(),
    code: event.code,
  });
}
