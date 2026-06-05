import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { resolveImageUrl } from "@/lib/s3";
import { redirect } from "next/navigation";
import Link from "next/link";
import MomentBrowser from "@/components/MomentBrowser";

async function getMoments() {
  const events = await db.event.findMany({
    where: { isActive: true },
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

export default async function HomePage() {
  const session = await auth();
  if (!session) redirect("/login");

  const moments = await getMoments();

  return (
    <div className="max-w-md mx-auto h-[100dvh] flex flex-col px-4">
      <header className="shrink-0 flex items-center justify-between py-4">
        <div>
          <h1 className="text-2xl font-bold">유어모먼트</h1>
          <p className="text-gray-400 text-sm mt-0.5">오늘의 순간을 찾아보세요</p>
        </div>
        <Link
          href="/me"
          className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center active:scale-95 transition-transform"
          aria-label="마이페이지"
        >
          <span className="text-lg">👤</span>
        </Link>
      </header>

      <MomentBrowser moments={moments} />
    </div>
  );
}
