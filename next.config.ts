import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
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
