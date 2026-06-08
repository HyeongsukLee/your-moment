import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { resolveImageUrl } from "@/lib/s3";
import { redirect } from "next/navigation";
import Link from "next/link";
import MomentBrowser from "@/components/MomentBrowser";
import NotificationBell from "@/components/NotificationBell";

async function getMoments(userId: string, isAdmin: boolean) {
  const events = await db.event.findMany({
    // 관리자는 전체, 그 외에는 자신이 가입한 그룹의 행사만 노출.
    where: isAdmin
      ? { isActive: true }
      : { isActive: true, group: { members: { some: { id: userId } } } },
    orderBy: { date: "desc" },
    select: {
      id: true,
      name: true,
      description: true,
      date: true,
      coverPhotoId: true,
      coverPosition: true,
      _count: { select: { photos: true } },
      // 대표 사진 미지정 시 fallback으로 쓸 첫 사진
      photos: {
        take: 1,
        orderBy: { createdAt: "asc" },
        select: { thumbnailKey: true },
      },
    },
  });

  // 지정된 대표 사진들의 thumbnailKey를 한 번에 조회
  const coverIds = events.map((e) => e.coverPhotoId).filter(Boolean) as string[];
  const coverPhotos = coverIds.length
    ? await db.photo.findMany({
        where: { id: { in: coverIds } },
        select: { id: true, thumbnailKey: true },
      })
    : [];
  const coverMap = new Map(coverPhotos.map((p) => [p.id, p.thumbnailKey]));

  return Promise.all(
    events.map(async (e) => {
      const coverKey =
        (e.coverPhotoId && coverMap.get(e.coverPhotoId)) ||
        e.photos[0]?.thumbnailKey ||
        null;
      return {
        id: e.id,
        name: e.name,
        description: e.description,
        date: e.date.toISOString(),
        photoCount: e._count.photos,
        coverUrl: coverKey ? await resolveImageUrl(coverKey) : null,
        coverPosition: e.coverPosition,
      };
    })
  );
}

// 한국식 이름(한글 2~4자)만 인사말에 사용, 아니면 "당신"으로 fallback
function greetingName(name?: string | null) {
  if (name && /^[가-힣]{2,4}$/.test(name.trim())) return name.trim();
  return "당신";
}

export default async function HomePage() {
  const session = await auth();
  if (!session) redirect("/login");

  const isAdmin = session.user?.role === "ADMIN";
  const moments = await getMoments(session.user.id, isAdmin);
  const displayName = greetingName(session.user?.name);

  return (
    <div className="max-w-md mx-auto h-[100dvh] flex flex-col px-4">
      <header className="shrink-0 flex items-center justify-between py-4">
        <div>
          <h1 className="text-2xl font-bold">your moment</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            {displayName}님의 순간을 찾아보세요
          </p>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <Link
            href="/me"
            className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center active:scale-95 transition-transform"
            aria-label="마이페이지"
          >
            <span className="text-lg">👤</span>
          </Link>
        </div>
      </header>

      {moments.length === 0 ? (
        <div className="flex flex-col flex-1 min-h-0 items-center justify-center text-center px-8 gap-3">
          <span className="text-5xl">📭</span>
          <p className="text-gray-300 font-medium">아직 참여한 행사가 없어요</p>
          <p className="text-gray-500 text-sm leading-relaxed">
            주최 측에서 받은 <b className="text-gray-300">참여 링크</b>로 입장하면
            <br />그 행사의 사진을 볼 수 있어요.
          </p>
        </div>
      ) : (
        <MomentBrowser moments={moments} />
      )}
    </div>
  );
}
