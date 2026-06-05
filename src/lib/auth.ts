import NextAuth from "next-auth";
import KakaoProvider from "next-auth/providers/kakao";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "@/lib/db";

const isDev = process.env.NODE_ENV !== "production";
// 운영에서도 간편 로그인을 임시로 켤 수 있는 플래그 (카카오 설정 전)
const simpleLoginEnabled =
  isDev || process.env.NEXT_PUBLIC_ENABLE_SIMPLE_LOGIN === "true";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    // 카카오는 env가 설정된 경우에만 등록 (미설정 시 잘못된 provider 방지)
    ...(process.env.KAKAO_CLIENT_ID
      ? [
          KakaoProvider({
            clientId: process.env.KAKAO_CLIENT_ID,
            clientSecret: process.env.KAKAO_CLIENT_SECRET!,
          }),
        ]
      : []),
    // 구글도 env가 설정된 경우에만 등록 (자격증명 준비되면 활성화)
    ...(process.env.GOOGLE_CLIENT_ID
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
          }),
        ]
      : []),
    // 간편 로그인: 카카오 설정 전 갤러리/검색을 테스트하기 위한 원클릭 로그인
    ...(simpleLoginEnabled
      ? [
          CredentialsProvider({
            id: "dev",
            name: "개발용 로그인",
            credentials: {},
            async authorize() {
              // 데모 유저를 DB에 보장 (검색/다운로드의 userId FK 충족)
              const user = await db.user.upsert({
                where: { email: "dev@yourmoment.local" },
                update: {},
                create: {
                  email: "dev@yourmoment.local",
                  name: "개발 테스터",
                },
              });
              return { id: user.id, email: user.email, name: user.name };
            },
          }),
        ]
      : []),
  ],
  callbacks: {
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
