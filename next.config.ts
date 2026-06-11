import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Vercel 이미지 최적화 비활성화 — 이미 S3에 최적화된 썸네일 저장됨.
    // 최적화 할당량(402 Payment Required) 소진 방지 + 직접 서빙.
    unoptimized: true,
    remotePatterns: [
      // 데모 단계 placeholder 이미지
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "fastly.picsum.photos" },
      // 실제 S3 버킷 (presigned URL 호스트, 서울 ap-northeast-2)
      { protocol: "https", hostname: "*.s3.ap-northeast-2.amazonaws.com" },
    ],
  },
};

export default nextConfig;
