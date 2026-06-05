import { requireAdmin } from "@/lib/admin";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function AdminDashboard() {
  const session = await requireAdmin();
  if (!session) redirect("/");

  return (
    <div className="max-w-md mx-auto px-4 py-6">
      <header className="flex items-center gap-3 mb-8">
        <Link href="/me" className="text-gray-400">
          ←
        </Link>
        <h1 className="text-xl font-bold flex-1">관리자 페이지</h1>
        <span className="text-[10px] text-indigo-300 bg-indigo-900/60 px-2 py-0.5 rounded-full">
          ADMIN
        </span>
      </header>

      <div className="space-y-3">
        <Link
          href="/admin/upload"
          className="block bg-gray-900 rounded-2xl p-5 active:scale-[0.98] transition-transform"
        >
          <div className="text-2xl mb-2">📤</div>
          <h2 className="font-semibold">사진 업로드</h2>
          <p className="text-gray-400 text-sm mt-1">
            순간을 만들고 사진을 일괄 업로드 · 자동 얼굴 분석
          </p>
        </Link>

        <Link
          href="/admin/cover"
          className="block bg-gray-900 rounded-2xl p-5 active:scale-[0.98] transition-transform"
        >
          <div className="text-2xl mb-2">🖼</div>
          <h2 className="font-semibold">대표 사진 설정</h2>
          <p className="text-gray-400 text-sm mt-1">
            순간별로 카드에 보일 대표 사진과 위치를 지정
          </p>
        </Link>
      </div>
    </div>
  );
}
