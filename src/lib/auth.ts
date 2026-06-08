import NextAuth from "next-auth";
import KakaoProvider from "next-auth/providers/kakao";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import type { Role } from "@prisma/client";

const isDev = process.env.NODE_ENV !== "production";
// 운영에서도 간편 로그인을 임시로 켤 수 있는 플래그 (소셜 설정 전)
const simpleLoginEnabled =
  isDev || process.env.NEXT_PUBLIC_ENABLE_SIMPLE_LOGIN === "true";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim())
  .filter(Boolean);

// 카카오는 이메일을 기본 제공하지 않으므로, kakaoId로도 관리자 지정 가능
const ADMIN_KAKAO_IDS = (process.env.ADMIN_KAKAO_IDS ?? "")
  .split(",")
  .map((e) => e.trim())
  .filter(Boolean);

/**
 * 소셜 로그인 유저를 DB에 보장하고 role을 반환.
 * 카카오는 이메일이 없을 수 있으므로 kakaoId를 식별 키로 사용한다.
 * email/ADMIN_EMAILS 또는 kakaoId/ADMIN_KAKAO_IDS 매칭 시 ADMIN 승격.
 */
async function ensureUser(profile: {
  kakaoId?: string | null;
  email?: string | null;
  name?: string | null;
  image?: string | null;
}): Promise<{ id: string; role: Role } | null> {
  if (!profile.kakaoId) return null;
  const shouldBeAdmin =
    (!!profile.email && ADMIN_EMAILS.includes(profile.email)) ||
    ADMIN_KAKAO_IDS.includes(profile.kakaoId);

  const user = await db.user.upsert({
    where: { kakaoId: profile.kakaoId },
    update: {
      name: profile.name ?? undefined,
      image: profile.image ?? undefined,
      email: profile.email ?? undefined,
      ...(shouldBeAdmin ? { role: "ADMIN" } : {}),
    },
    create: {
      kakaoId: profile.kakaoId,
      email: profile.email ?? null,
      name: profile.name,
      image: profile.image,
      role: shouldBeAdmin ? "ADMIN" : "PARTICIPANT",
    },
    select: { id: true, role: true },
  });
  return user;
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    // KAKAO_CLIENT_SECRET은 선택사항 — 없으면 빈 문자열로 동작
    ...(process.env.KAKAO_CLIENT_ID
      ? [
          KakaoProvider({
            clientId: process.env.KAKAO_CLIENT_ID,
            clientSecret: process.env.KAKAO_CLIENT_SECRET ?? "",
          }),
        ]
      : []),
    ...(process.env.GOOGLE_CLIENT_ID
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
          }),
        ]
      : []),
    // 간편 로그인: 테스트 계정(@yourmoment.local) 선택 로그인
    ...(simpleLoginEnabled
      ? [
          CredentialsProvider({
            id: "dev",
            name: "테스트 계정",
            credentials: { email: {} },
            async authorize(credentials) {
              const email =
                (credentials?.email as string) || "dev@yourmoment.local";
              // 시드된 테스트 계정만 허용
              if (!email.endsWith("@yourmoment.local")) return null;
              const user = await db.user.findUnique({
                where: { email },
                select: { id: true, email: true, name: true },
              });
              if (!user) return null;
              return { id: user.id, email: user.email, name: user.name };
            },
          }),
        ]
      : []),
  ],
  callbacks: {
    // 소셜 로그인 시 유저를 DB에 보장
    async signIn({ user, account }) {
      if (account?.provider === "kakao") {
        await ensureUser({
          kakaoId: account.providerAccountId,
          email: user.email,
          name: user.name,
          image: user.image,
        });
      } else if (account?.provider === "google") {
        // 구글은 이메일을 항상 제공 (현재 미사용이나 호환 유지)
        if (user.email) {
          const shouldBeAdmin = ADMIN_EMAILS.includes(user.email);
          await db.user.upsert({
            where: { email: user.email },
            update: {
              name: user.name ?? undefined,
              image: user.image ?? undefined,
              ...(shouldBeAdmin ? { role: "ADMIN" } : {}),
            },
            create: {
              email: user.email,
              name: user.name,
              image: user.image,
              role: shouldBeAdmin ? "ADMIN" : "PARTICIPANT",
            },
          });
        }
      }
      return true;
    },
    // JWT에 DB의 uid/role 적재 (카카오는 kakaoId 우선, 없으면 email)
    async jwt({ token, account }) {
      if (account?.provider === "kakao") {
        token.kakaoId = account.providerAccountId;
      }
      const dbUser = token.kakaoId
        ? await db.user.findUnique({
            where: { kakaoId: token.kakaoId as string },
            select: { id: true, role: true, email: true },
          })
        : token.email
        ? await db.user.findUnique({
            where: { email: token.email },
            select: { id: true, role: true, email: true },
          })
        : null;
      if (dbUser) {
        token.uid = dbUser.id;
        token.role = dbUser.role;
        if (dbUser.email) token.email = dbUser.email;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.uid ?? token.sub ?? "";
        session.user.role = token.role ?? "PARTICIPANT";
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
