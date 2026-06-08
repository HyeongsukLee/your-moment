import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";

// 관리자: 작가 인스타 아이디 저장 (사진 출처 표시용)
export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId, instagram } = await req.json();
  if (!userId) {
    return Response.json({ error: "userId 필요" }, { status: 400 });
  }

  // @, 공백, URL 형태 정규화 → 순수 핸들만 저장
  const handle = (instagram ?? "")
    .toString()
    .trim()
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
    .replace(/^@/, "")
    .replace(/\/.*$/, "")
    .trim();

  const updated = await db.user.update({
    where: { id: userId },
    data: { instagram: handle || null },
    select: { id: true, instagram: true },
  });

  return Response.json(updated);
}
