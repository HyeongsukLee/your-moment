import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { deleteObjects } from "@/lib/s3";
import { deleteFaces } from "@/lib/rekognition";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { eventId } = await params;
  const body = await req.json();

  if (typeof body.isActive !== "boolean") {
    return Response.json({ error: "isActive(boolean) 필요" }, { status: 400 });
  }

  const event = await db.event.update({
    where: { id: eventId },
    data: { isActive: body.isActive },
    select: { id: true, name: true, isActive: true },
  });

  return Response.json(event);
}

// 행사 삭제 — 관리자 전용. 속한 사진(S3·Rekognition·DB) 전체 정리 후 삭제.
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { eventId } = await params;

  const photos = await db.photo.findMany({
    where: { eventId },
    select: { rekognitionId: true, s3Key: true, thumbnailKey: true },
  });

  // 1. Rekognition 얼굴 삭제 (id 있는 것만)
  const faceIds = photos
    .map((p) => p.rekognitionId)
    .filter((id): id is string => !!id);
  if (faceIds.length) await deleteFaces(faceIds);

  // 2. S3 원본 + 썸네일 삭제
  const keys = photos.flatMap((p) => [p.s3Key, p.thumbnailKey]);
  if (keys.length) await deleteObjects(keys);

  // 3. DB 삭제 (Photo/Search/SearchResult는 cascade)
  await db.event.delete({ where: { id: eventId } });

  return Response.json({ ok: true, deletedPhotos: photos.length });
}
