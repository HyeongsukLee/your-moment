import { canUploadToEvent } from "@/lib/admin";
import { db } from "@/lib/db";
import { indexFace, ensureCollection } from "@/lib/rekognition";

export async function POST(req: Request) {
  const { eventId, photoId, s3Key, thumbnailKey } = await req.json();

  const session = await canUploadToEvent(eventId);
  if (!session) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  // Collection이 없으면 자동 생성 (최초 1회)
  await ensureCollection();
  const faceRecords = await indexFace(s3Key, photoId);

  const photo = await db.photo.create({
    data: {
      id: photoId,
      eventId,
      uploaderId: session.user.id,
      s3Key,
      thumbnailKey,
      rekognitionId: faceRecords[0]?.Face?.FaceId ?? null,
    },
  });

  return Response.json({ photoId: photo.id, facesIndexed: faceRecords.length });
}
