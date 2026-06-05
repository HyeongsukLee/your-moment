import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { resolveImageUrl } from "@/lib/s3";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 내 검색에서 매칭된 모든 결과 (사진 + 행사 정보 포함)
  const results = await db.searchResult.findMany({
    where: { search: { userId: session.user.id } },
    orderBy: { search: { createdAt: "desc" } },
    select: {
      photo: {
        select: {
          id: true,
          thumbnailKey: true,
          event: { select: { id: true, name: true, date: true } },
        },
      },
    },
  });

  // 행사별 그룹핑 + 사진 중복 제거
  const groupMap = new Map<
    string,
    { eventId: string; eventName: string; date: string; photos: { id: string; thumbnailKey: string }[]; seen: Set<string> }
  >();

  for (const r of results) {
    const ev = r.photo.event;
    let g = groupMap.get(ev.id);
    if (!g) {
      g = {
        eventId: ev.id,
        eventName: ev.name,
        date: ev.date.toISOString(),
        photos: [],
        seen: new Set(),
      };
      groupMap.set(ev.id, g);
    }
    if (!g.seen.has(r.photo.id)) {
      g.seen.add(r.photo.id);
      g.photos.push({ id: r.photo.id, thumbnailKey: r.photo.thumbnailKey });
    }
  }

  // 행사 날짜 최신순 정렬 + presigned URL 변환
  const groups = await Promise.all(
    [...groupMap.values()]
      .sort((a, b) => +new Date(b.date) - +new Date(a.date))
      .map(async (g) => ({
        eventId: g.eventId,
        eventName: g.eventName,
        date: g.date,
        photos: await Promise.all(
          g.photos.map(async (p) => ({
            id: p.id,
            thumbnailUrl: await resolveImageUrl(p.thumbnailKey),
          }))
        ),
      }))
  );

  return Response.json({ groups });
}
