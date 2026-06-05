import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { GetObjectCommand } from "@aws-sdk/client-s3";

export const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.AWS_S3_BUCKET!;

export async function getPresignedDownloadUrl(key: string, expiresIn = 3600) {
  return getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: BUCKET, Key: key }),
    { expiresIn }
  );
}

export async function getPresignedUploadUrl(key: string, contentType: string) {
  return getSignedUrl(
    s3,
    new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: contentType }),
    { expiresIn: 3600 }
  );
}

/**
 * 이미지(썸네일/원본) 표시용 URL을 반환.
 * - 시드/데모 데이터처럼 이미 완성된 http URL이면 그대로 통과
 * - 실제 S3 키면 비공개 버킷이므로 presigned GET URL 생성
 */
export async function resolveImageUrl(key: string, expiresIn = 3600) {
  if (key.startsWith("http")) return key;
  return getPresignedDownloadUrl(key, expiresIn);
}
