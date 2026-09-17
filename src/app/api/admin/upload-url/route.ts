import { canUploadToEvent } from "@/lib/admin";
import { getPresignedUploadUrl } from "@/lib/s3";
import { isAllowedUploadType, ALLOWED_UPLOAD_LABEL } from "@/lib/upload";
import { randomUUID } from "crypto";

export async function POST(req: Request) {
  const { eventId, contentType } = await req.json();

  // 권한 검사를 형식 검사보다 먼저 한다 — 권한 없는 사람에게
  // 내부 형식 정책("어떤 형식을 받는지")을 노출하지 않기 위해서다.
  const session = await canUploadToEvent(eventId);
  if (!session) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!isAllowedUploadType(contentType)) {
    return Response.json(
      { error: "Invalid content type", allowed: ALLOWED_UPLOAD_LABEL },
      { status: 400 }
    );
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
