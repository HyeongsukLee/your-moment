import { canDeletePhoto } from "@/lib/admin";
import { db } from "@/lib/db";
import { deleteObjects } from "@/lib/s3";
import { deleteFaces } from "@/lib/rekognition";

// 사진 삭제 — 관리자는 모든 사진, 작가는 본인이 올린 사진만
export async function POST(req: Request) {
  const { photoId } = await req.json();
  if (!photoId) {
    return Response.json({ error: "photoId required" }, { status: 400 });
  }

  const result = await canDeletePhoto(photoId);
  if (!result) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  const { photo } = result;

  // 1. Rekognition 얼굴 삭제
  if (photo.rekognitionId) {
    await deleteFaces([photo.rekognitionId]);
  }
  // 2. S3 원본 + 썸네일 삭제
  await deleteObjects([photo.s3Key, photo.thumbnailKey]);
  // 3. 대표사진이었으면 해제
  await db.event.updateMany({
    where: { coverPhotoId: photo.id },
    data: { coverPhotoId: null, coverPosition: null },
  });
  // 4. DB 삭제 (searchResult는 cascade)
  await db.photo.delete({ where: { id: photo.id } });

  return Response.json({ ok: true, deletedId: photo.id });
}
