import { requireStaff, requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";

// 운영진: 순간(행사) 목록 조회 — 관리자는 전체, 작가는 배정된 행사만
export async function GET() {
  const session = await requireStaff();
  if (!session) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const isAdmin = session.user.role === "ADMIN";

  const events = await db.event.findMany({
    where: isAdmin
      ? {}
      : { photographers: { some: { id: session.user.id } } },
    orderBy: { date: "desc" },
    select: {
      id: true,
      name: true,
      date: true,
      _count: { select: { photos: true } },
    },
  });

  return Response.json(
    events.map((e) => ({
      id: e.id,
      name: e.name,
      date: e.date.toISOString(),
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

  const { name, date, description } = await req.json();
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
    },
    select: { id: true, name: true, date: true },
  });

  return Response.json({ id: event.id, name: event.name, date: event.date.toISOString() });
}
