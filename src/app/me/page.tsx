"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import Image from "next/image";

type Group = {
  eventId: string;
  eventName: string;
  date: string;
  photos: { id: string; thumbnailUrl: string }[];
};

// 데모용: 내 사진 5개가 있다고 가정 (실제 검색 결과가 없을 때 미리보기)
const DEMO_GROUPS: Group[] = [
  {
    eventId: "demo-a",
    eventName: "한강 러닝크루 나이트런",
    date: "2026-05-28",
    photos: [1, 2, 3].map((n) => ({
      id: `demo-a-${n}`,
      thumbnailUrl: `https://picsum.photos/seed/me-a-${n}/400/400`,
    })),
  },
  {
    eventId: "demo-b",
    eventName: "2026 성남 마라톤",
    date: "2026-05-20",
    photos: [1, 2].map((n) => ({
      id: `demo-b-${n}`,
      thumbnailUrl: `https://picsum.photos/seed/me-b-${n}/400/400`,
    })),
  },
];

export default function MyPage() {
  const router = useRouter();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    fetch("/api/me/photos")
      .then((r) => r.json())
      .then((data) => {
        const real: Group[] = data.groups ?? [];
        // 데모: 아직 찾은 사진이 없으면 내 사진 5개가 있다고 가정해 보여줌
        setGroups(real.length ? real : DEMO_GROUPS);
        setLoading(false);
      });
    fetch("/api/me")
      .then((r) => r.json())
      .then((data) => setIsAdmin(!!data.isAdmin))
      .catch(() => {});
  }, []);

  const totalPhotos = groups.reduce((s, g) => s + g.photos.length, 0);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function downloadSelected() {
    const ids = [...selected];
    if (ids.length === 0) return;
    setDownloading(true);
    try {
      const res = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoIds: ids }),
      });
      const { urls } = await res.json();
      for (const { url } of urls ?? []) {
        const a = document.createElement("a");
        a.href = url;
        a.download = "";
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
      setSelected(new Set());
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto pb-28">
      <div className="sticky top-0 z-10 bg-gray-950/90 backdrop-blur px-4 py-4 flex items-center gap-3">
        <button onClick={() => router.push("/")} className="text-gray-400">
          ←
        </button>
        <h1 className="font-semibold text-lg flex-1">마이페이지</h1>
        {totalPhotos > 0 && (
          <span className="text-gray-400 text-sm">총 {totalPhotos}장</span>
        )}
      </div>

      {/* 관리자 전용 섹션 */}
      {isAdmin && (
        <div className="px-4 mt-4">
          <div className="bg-gray-900 rounded-2xl p-4 border border-indigo-900/50">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-semibold">🛠 관리자</span>
              <span className="text-[10px] text-indigo-300 bg-indigo-900/60 px-2 py-0.5 rounded-full">
                ADMIN
              </span>
            </div>
            <button
              onClick={() => router.push("/admin")}
              className="w-full bg-indigo-600 active:bg-indigo-700 text-white text-sm font-medium py-3 rounded-xl"
            >
              관리자 페이지 열기
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64 text-gray-500">
          불러오는 중...
        </div>
      ) : groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-72 gap-3 text-gray-500 px-6 text-center">
          <span className="text-4xl">📭</span>
          <p>아직 찾은 사진이 없어요</p>
          <p className="text-sm text-gray-600">
            순간에 입장해서 &lsquo;내 사진 찾기&rsquo;로 셀카를 찍어보세요
          </p>
          <button
            onClick={() => router.push("/")}
            className="mt-2 bg-indigo-600 text-white text-sm font-medium px-5 py-2.5 rounded-xl"
          >
            순간 둘러보기
          </button>
        </div>
      ) : (
        <div className="px-4 space-y-8 mt-4">
          {groups.map((g) => (
            <section key={g.eventId}>
              <div className="flex items-baseline justify-between mb-3">
                <button
                  onClick={() => {
                    if (!g.eventId.startsWith("demo-"))
                      router.push(`/events/${g.eventId}`);
                  }}
                  className="font-semibold text-base text-left"
                >
                  {g.eventName}
                </button>
                <span className="text-gray-500 text-xs">
                  {new Date(g.date).toLocaleDateString("ko-KR", {
                    month: "long",
                    day: "numeric",
                  })}{" "}
                  · {g.photos.length}장
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                {g.photos.map((p) => {
                  const isSel = selected.has(p.id);
                  return (
                    <button
                      key={p.id}
                      onClick={() => toggle(p.id)}
                      className={`aspect-square relative bg-gray-900 rounded-lg overflow-hidden ${
                        isSel ? "ring-2 ring-indigo-500 ring-inset" : ""
                      }`}
                    >
                      <Image
                        src={p.thumbnailUrl}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="33vw"
                      />
                      {isSel && (
                        <span className="absolute top-1.5 right-1.5 bg-indigo-600 rounded-full w-5 h-5 flex items-center justify-center text-[11px]">
                          ✓
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* 로그아웃 */}
      {!loading && (
        <div className="px-4 mt-10">
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-full border border-gray-800 text-gray-400 text-sm font-medium py-3 rounded-xl active:bg-gray-900"
          >
            로그아웃
          </button>
        </div>
      )}

      {/* 선택 다운로드 바 (하단 고정) */}
      {selected.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto p-4 bg-gray-950/95 backdrop-blur border-t border-gray-900">
          <button
            onClick={downloadSelected}
            disabled={downloading}
            className="w-full bg-white text-black font-semibold py-3.5 rounded-2xl text-sm disabled:opacity-60"
          >
            {downloading
              ? "다운로드 중..."
              : `선택한 ${selected.size}장 다운로드`}
          </button>
        </div>
      )}
    </div>
  );
}
