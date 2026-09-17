import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";

// 엣지 전용 인스턴스. @/lib/auth 를 import 하면 Prisma가 번들에 딸려 들어와
// 엣지 함수 크기 제한(1MB)을 넘기므로, DB를 모르는 authConfig만 사용한다.
// 역할 판정에 필요한 role은 이미 JWT 토큰에 실려 있어 DB 조회가 필요 없다.
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    const role = req.auth?.user?.role;
    if (role !== "ADMIN" && role !== "PHOTOGRAPHER") {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }
  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
