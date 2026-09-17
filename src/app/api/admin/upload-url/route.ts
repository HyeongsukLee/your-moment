import { canUploadToEvent } from "@/lib/admin";
import { getPresignedUploadUrl } from "@/lib/s3";
import { randomUUID } from "crypto";

const ALLOWED_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
]);

export async function POST(req: Request) {
  const { eventId, contentType } = await req.json();

  if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
    return Response.json({ error: "Invalid content type" }, { status: 400 });
  }

  const session = await canUploadToEvent(eventId);
  if (!session) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const photoId = randomUUID();
  const s3Key = `events/${eventId}/originals/${photoId}`;
  const thumbnailKey = `events/${eventId}/thumbnails/${photoId}`;

  // 원본 + 썸네일 둘 다 업로드용 presigned URL 발급
  const [uploadUrl, thumbnailUploadUrl] = await Promise.all([
    getPresignedUploadUrl(s3Key, contentType),
    getPresignedUploadUrl(thumbnailKey, "image/jpeg"),
  ]);

  return Response.json({
    photoId,
    s3Key,
    thumbnailKey,
    uploadUrl,
    thumbnailUploadUrl,
  });
}
