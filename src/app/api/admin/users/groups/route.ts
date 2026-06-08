import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";

// 관리자: 유저(주로 작가)의 그룹 소속을 직접 추가/제거.
// 작가는 소속 그룹의 모든 행사에 업로드할 수 있다(그룹 단위 권한).
export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId, groupId, member } = await req.json();
  if (!userId || !groupId || typeof member !== "boolean") {
    return Response.json(
      { error: "userId, groupId, member(boolean) 필요" },
      { status: 400 }
    );
  }

  await db.group.update({
    where: { id: groupId },
    data: {
      members: member
        ? { connect: { id: userId } }
        : { disconnect: { id: userId } },
    },
  });

  return Response.json({ ok: true });
}
