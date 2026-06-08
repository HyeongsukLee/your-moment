import { canUploadToEvent } from "@/lib/admin";
import { db } from "@/lib/db";
import { searchFacesByS3 } from "@/lib/rekognition";

// 배치 업로드 완료 후 호출 (업로드 세션당 1회).
// ③ PHOTOS_OF_ME: 이 행사에서 이전에 셀카 검색한 유저를 재매칭 → 새로 나온 사진 알림
// ① PHOTOS_UPLOADED: 개인 매칭이 없는 나머지 그룹 멤버에게 일반 업로드 알림
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const session = await canUploadToEvent((await params).eventId);
  const { eventId } = await params;
  if (!session) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const uploaderId = session.user.id;

  const event = await db.event.findUnique({
    where: { id: eventId },
    select: {
      name: true,
      groupId: true,
      group: { select: { members: { select: { id: true } } } },
    },
  });
  if (!event) return Response.json({ error: "Not found" }, { status: 404 });

  // 이 행사의 모든 사진 id (재매칭 결과를 이 행사 범위로 제한)
  const eventPhotos = await db.photo.findMany({
    where: { eventId },
    select: { id: true },
  });
  const eventPhotoIds = new Set(eventPhotos.map((p) => p.id));

  // 이 행사에서 셀카가 보관된(=재매칭 가능) 유저별 최신 검색
  const searches = await db.search.findMany({
    where: { eventId, NOT: { selfieKey: "temp" } },
    distinct: ["userId"],
    orderBy: { createdAt: "desc" },
    select: { id: true, userId: true, selfieKey: true },
  });

  const matchedUserIds = new Set<string>();

  for (const s of searches) {
    try {
      const faces = await searchFacesByS3(s.selfieKey);
      const matchedIds = faces
        .map((m) => m.Face?.ExternalImageId)
        .filter((id): id is string => !!id && eventPhotoIds.has(id));
      if (matchedIds.length === 0) continue;

      // 이 유저가 이 행사에서 이미 가진 결과 사진
      const existing = await db.searchResult.findMany({
        where: { search: { userId: s.userId, eventId }, photoId: { in: matchedIds } },
        select: { photoId: true },
      });
      const existingSet = new Set(existing.map((e) => e.photoId));
      const newIds = matchedIds.filter((id) => !existingSet.has(id));
      if (newIds.length === 0) continue;

      // 새 결과를 이 유저의 최신 검색에 추가
      await db.searchResult.createMany({
        data: newIds.map((photoId) => ({
          searchId: s.id,
          photoId,
          similarity:
            faces.find((m) => m.Face?.ExternalImageId === photoId)?.Similarity ?? 0,
        })),
        skipDuplicates: true,
      });

      await db.notification.create({
        data: {
          userId: s.userId,
          type: "PHOTOS_OF_ME",
          title: `회원님이 나온 새 사진 ${newIds.length}장이 추가됐어요`,
          body: event.name,
          eventId,
        },
      });
      matchedUserIds.add(s.userId);
    } catch {
      // 한 명 실패해도 나머지 진행
    }
  }

  // ① 개인 매칭이 없는 나머지 그룹 멤버에게 일반 업로드 알림
  const memberIds = (event.group?.members ?? [])
    .map((m) => m.id)
    .filter((id) => id !== uploaderId && !matchedUserIds.has(id));

  if (memberIds.length > 0) {
    await db.notification.createMany({
      data: memberIds.map((userId) => ({
        userId,
        type: "PHOTOS_UPLOADED",
        title: `${event.name} 사진이 올라왔어요`,
        eventId,
      })),
    });
  }

  return Response.json({
    ok: true,
    photosOfMe: matchedUserIds.size,
    uploaded: memberIds.length,
  });
}
