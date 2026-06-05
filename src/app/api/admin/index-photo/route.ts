import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { indexFace, ensureCollection } from "@/lib/rekognition";

export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { eventId, photoId, s3Key, thumbnailKey } = await req.json();

  // Collection이 없으면 자동 생성 (최초 1회)
  await ensureCollection();
  const faceRecords = await indexFace(s3Key, photoId);

  const photo = await db.photo.create({
    data: {
      id: photoId,
      eventId,
      s3Key,
      thumbnailKey,
      rekognitionId: faceRecords[0]?.Face?.FaceId ?? null,
    },
  });

  return Response.json({ photoId: photo.id, facesIndexed: faceRecords.length });
}
