"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import Toast, { type ToastData } from "@/components/Toast";

type GroupRow = {
  id: string;
  name: string;
  code: string;
  memberCount: number;
  eventCount: number;
};

export default function AdminGroupsPage() {
  const router = useRouter();
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [qrFor, setQrFor] = useState<GroupRow | null>(null);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/groups");
    if (res.status === 403) {
      router.push("/");
      return;
    }
    try {
      setGroups(await res.json());
    } catch {
      setLoading(false);
      return;
    }
    setLoading(false);
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  function linkOf(g: GroupRow) {
    return `${origin}/join/${g.code}`;
  }

  async function createGroup() {
    if (!newName.trim()) {
      setToast({ message: "그룹 이름을 입력하세요" });
      return;
    }
    setCreating(true);
    const res = await fetch("/api/admin/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName }),
    });
    setCreating(false);
    if (!res.ok) {
      setToast({ message: "생성 실패" });
      return;
    }
    setNewName("");
    await load();
    setToast({ message: "그룹을 만들었어요" });
  }

  async function copyLink(g: GroupRow) {
    try {
      await navigator.clipboard.writeText(linkOf(g));
      setToast({ message: "참여 링크를 복사했어요", sub: linkOf(g) });
    } catch {
      setToast({ message: "복사 실패", sub: linkOf(g) });
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-6">
      <header className="flex items-center gap-3 mb-5">
        <button onClick={() => router.push("/admin")} className="text-gray-400">
          ←
        </button>
        <h1 className="text-xl font-bold flex-1">그룹 관리</h1>
      </header>

      {/* 새 그룹 생성 */}
      <div className="mb-5 bg-gray-900 rounded-xl p-4 flex gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="그룹 이름 (예: 바로, 컴포트)"
          className="flex-1 bg-gray-800 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 ring-indigo-500"
        />
        <button
          onClick={createGroup}
          disabled={creating}
          className="bg-indigo-600 active:bg-indigo-700 text-white text-sm font-medium px-4 rounded-lg disabled:opacity-60 shrink-0"
        >
          {creating ? "생성 중" : "생성"}
        </button>
      </div>

      {loading ? (
        <div className="text-center text-gray-500 py-16">불러오는 중...</div>
      ) : groups.length === 0 ? (
        <p className="text-center text-gray-600 text-sm py-12">
          아직 그룹이 없어요. 위에서 만들어 보세요.
        </p>
      ) : (
        <div className="space-y-3">
          {groups.map((g) => (
            <div key={g.id} className="bg-gray-900 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="font-semibold">{g.name}</div>
                <div className="text-gray-500 text-xs">
                  멤버 {g.memberCount} · 행사 {g.eventCount}
                </div>
              </div>
              <div className="text-[11px] text-gray-500 bg-gray-950 rounded-lg px-2.5 py-2 truncate">
                {origin}/join/{g.code}
              </div>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => copyLink(g)}
                  className="flex-1 text-xs font-medium py-2 rounded-lg bg-indigo-600 active:bg-indigo-700 text-white"
                >
                  링크 복사
                </button>
                <button
                  onClick={() => setQrFor(g)}
                  className="px-4 text-xs font-medium py-2 rounded-lg bg-gray-800 active:bg-gray-700 text-gray-200"
                >
                  QR
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-600 mt-6 leading-relaxed">
        참여 링크/QR를 그룹 사람들에게 공유하면, 링크로 들어온 사람만 그 그룹의 행사를
        홈에서 볼 수 있어요.
      </p>

      {/* QR 모달 */}
      {qrFor && (
        <div
          className="fixed inset-0 z-40 bg-black/80 flex items-center justify-center p-6"
          onClick={() => setQrFor(null)}
        >
          <div
            className="bg-white rounded-3xl p-6 flex flex-col items-center gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <QRCodeSVG value={linkOf(qrFor)} size={220} />
            <div className="text-center">
              <div className="text-black font-bold">{qrFor.name}</div>
              <div className="text-gray-500 text-xs mt-0.5">
                스캔하면 그룹에 참여돼요
              </div>
            </div>
            <button
              onClick={() => setQrFor(null)}
              className="text-gray-500 text-sm"
            >
              닫기
            </button>
          </div>
        </div>
      )}

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
