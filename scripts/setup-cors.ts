/**
 * S3 버킷 CORS 설정 스크립트
 * 새 도메인 추가 시 AllowedOrigins에 추가 후 실행:
 *   npx dotenv -e .env.local -- npx ts-node scripts/setup-cors.ts
 */
import { S3Client, PutBucketCorsCommand, GetBucketCorsCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.AWS_S3_BUCKET!;

const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "https://*.vercel.app",
  "https://your-moment.site",
  "https://www.your-moment.site",
];

async function main() {
  await s3.send(
    new PutBucketCorsCommand({
      Bucket: BUCKET,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedMethods: ["PUT", "GET", "HEAD"],
            AllowedOrigins: ALLOWED_ORIGINS,
            AllowedHeaders: ["*"],
            ExposeHeaders: ["ETag"],
            MaxAgeSeconds: 3000,
          },
        ],
      },
    })
  );
  console.log("✅ CORS 업데이트 완료");

  const { CORSRules } = await s3.send(new GetBucketCorsCommand({ Bucket: BUCKET }));
  console.log("현재 허용 origin:", CORSRules?.[0]?.AllowedOrigins);
}

main().catch((e) => {
  console.error("❌ 실패:", e.message);
  process.exit(1);
});
