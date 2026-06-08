import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { generateCode } from "@/lib/code";

// 관리자: 그룹 목록 (멤버수·행사수 포함)
export async function GET() {
  const session = await requireAdmin();
  if (!session) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const groups = await db.group.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      code: true,
      _count: { select: { members: true, events: true } },
    },
  });

  return Response.json(
    groups.map((g) => ({
      id: g.id,
      name: g.name,
      code: g.code,
      memberCount: g._count.members,
      eventCount: g._count.events,
    }))
  );
}

// 관리자: 새 그룹 생성 (참여 코드 자동 발급)
export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { name } = await req.json();
  if (!name || !name.trim()) {
    return Response.json({ error: "그룹 이름이 필요합니다" }, { status: 400 });
  }

  const group = await db.group.create({
    data: { name: name.trim(), code: generateCode() },
    select: { id: true, name: true, code: true },
  });

  return Response.json(group);
}
