import type { NextAuthConfig } from "next-auth";

/**
 * 엣지 런타임에서도 동작하는 next-auth 설정.
 *
 * 미들웨어(src/middleware.ts)가 이 파일만 import 하므로,
 * 여기서는 절대로 Prisma(@/lib/db, @prisma/client)를 값으로 가져오지 않는다.
 * Prisma Client는 엣지에서 실행되지 않을 뿐 아니라, 번들에 포함되면
 * 엣지 함수 크기가 1MB 제한을 넘겨 배포가 실패한다.
 *
 * DB가 필요한 부분(providers, signIn·jwt 콜백)은 src/lib/auth.ts에서 덧붙인다.
 */
export const authConfig = {
  // 미들웨어는 로그인을 처리하지 않으므로 프로바이더가 필요 없다.
  // 실제 프로바이더는 src/lib/auth.ts에서 채운다.
  providers: [],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    // 토큰에 이미 적재된 uid/role을 세션으로 옮기기만 하는 순수 함수.
    // DB를 보지 않으므로 미들웨어에서도 그대로 쓸 수 있다.
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.uid ?? token.sub ?? "";
        session.user.role = token.role ?? "PARTICIPANT";
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
