import { requireStaff } from "@/lib/admin";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function AdminCoverList() {
  const session = await requireStaff();
  if (!session) redirect("/");

  const isAdmin = session.user.role === "ADMIN";

  const events = await db.event.findMany({
    where: isAdmin ? {} : { ownerId: session.user.id },
    orderBy: { date: "desc" },
    select: {
      id: true,
      name: true,
      date: true,
      _count: { select: { photos: true } },
    },
  });

  return (
    <div className="max-w-md mx-auto px-4 py-6">
      <header className="flex items-center gap-3 mb-6">
        <Link href="/admin" className="text-gray-400">
          ←
        </Link>
        <h1 className="text-xl font-bold flex-1">대표 사진 설정</h1>
      </header>

      <p className="text-sm text-gray-400 mb-4">
        대표 사진을 지정할 순간을 선택하세요
      </p>

      <div className="space-y-2">
        {events.map((e) => (
          <Link
            key={e.id}
            href={`/admin/cover/${e.id}`}
            className="flex items-center justify-between bg-gray-900 rounded-xl px-4 py-4 active:scale-[0.98] transition-transform"
          >
            <div>
              <div className="font-medium">{e.name}</div>
              <div className="text-gray-500 text-xs mt-0.5">
                {new Date(e.date).toLocaleDateString("ko-KR")} · {e._count.photos}장
              </div>
            </div>
            <span className="text-gray-600">›</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
