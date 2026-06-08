import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";

// 행사 공유 링크: /e/<행사코드>
// 그 행사가 속한 그룹에 가입시킨 뒤(=그룹 전체 열림) 홈으로 이동.
// (행사 페이지로 직행하지 않는다 — 메인에서 그 그룹 행사가 보이게 됨.)
export default async function JoinByEventPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=/e/${code}`);
  }

  const event = await db.event.findUnique({
    where: { code },
    select: { id: true, groupId: true },
  });

  if (!event || !event.groupId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center gap-4">
        <span className="text-4xl">🔍</span>
        <p className="text-gray-300">
          {event ? "이 행사는 아직 그룹에 연결되지 않았어요." : "존재하지 않는 링크예요."}
        </p>
        <Link href="/" className="text-indigo-400 text-sm font-medium">
          홈으로 가기 →
        </Link>
      </div>
    );
  }

  await db.group.update({
    where: { id: event.groupId },
    data: { members: { connect: { id: session.user.id } } },
  });

  redirect(`/events/${event.id}`);
}
