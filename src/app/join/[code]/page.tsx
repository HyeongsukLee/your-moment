import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";

// 그룹 참여 링크: /join/<그룹코드>
// 로그인한 유저를 그 그룹 멤버로 연결한 뒤 홈으로 이동.
export default async function JoinGroupPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const session = await auth();

  // 미로그인 → 로그인 후 다시 이 페이지로
  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=/join/${code}`);
  }

  const group = await db.group.findUnique({ where: { code } });
  if (!group) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center gap-4">
        <span className="text-4xl">🔍</span>
        <p className="text-gray-300">존재하지 않는 참여 링크예요.</p>
        <Link href="/" className="text-indigo-400 text-sm font-medium">
          홈으로 가기 →
        </Link>
      </div>
    );
  }

  // 멤버 연결 (이미 멤버여도 idempotent)
  await db.group.update({
    where: { id: group.id },
    data: { members: { connect: { id: session.user.id } } },
  });

  redirect("/");
}
