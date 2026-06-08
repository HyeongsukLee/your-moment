"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import Toast, { type ToastData } from "@/components/Toast";

type EventItem = {
  id: string;
  name: string;
  date: string;
  isActive: boolean;
  photoCount: number;
  code: string | null;
  groupId: string | null;
  groupName: string | null;
};

type GroupOpt = { id: string; name: string; code: string };

type SortKey = "dateDesc" | "dateAsc" | "name";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "dateDesc", label: "최신순" },
  { key: "dateAsc", label: "오래된순" },
  { key: "name", label: "이름순" },
];

export default function AdminEventsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [groups, setGroups] = useState<GroupOpt[]>([]);
  const [draft, setDraft] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sort, setSort] = useState<SortKey>("dateDesc");
  const [groupFilter, setGroupFilter] = useState<string>("all"); // all | <groupId> | none
  const [toast, setToast] = useState<ToastData | null>(null);
  const [origin, setOrigin] = useState("");
  const [qrFor, setQrFor] = useState<EventItem | null>(null);

  // 새 행사 생성 폼
  const [newName, setNewName] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newGroupId, setNewGroupId] = useState("");
  const [creating, setCreating] = useState(false);

  // 삭제 확인
  const [deleteTarget, setDeleteTarget] = useState<EventItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const loadEvents = useCallback(async () => {
    const [eRes, gRes] = await Promise.all([
      fetch("/api/admin/events?all=1"),
      fetch("/api/admin/groups"),
    ]);
    if (eRes.status === 403) {
      router.push("/");
      return;
    }
    let data: EventItem[];
    try {
      data = await eRes.json();
    } catch {
      setLoading(false);
      return;
    }
    setEvents(data);
    setDraft(Object.fromEntries(data.map((e) => [e.id, e.isActive])));
    if (gRes.ok) {
      try { setGroups(await gRes.json()); } catch { /* 무시 */ }
    }
    setLoading(false);
  }, [router]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const filtered = useMemo(() => {
    let arr = [...events];
    if (groupFilter === "none") arr = arr.filter((e) => !e.groupId);
    else if (groupFilter !== "all")
      arr = arr.filter((e) => e.groupId === groupFilter);

    if (sort === "name") arr.sort((a, b) => a.name.localeCompare(b.name, "ko"));
    else
      arr.sort((a, b) => {
        const t = new Date(a.date).getTime() - new Date(b.date).getTime();
        return sort === "dateAsc" ? t : -t;
      });
    return arr;
  }, [events, sort, groupFilter]);

  const dirty = useMemo(
    () => events.some((e) => draft[e.id] !== e.isActive),
    [events, draft]
  );

  function toggleDraft(id: string) {
    setDraft((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function cancelChanges() {
    setDraft(Object.fromEntries(events.map((e) => [e.id, e.isActive])));
  }

  async function saveChanges() {
    const changed = events.filter((e) => draft[e.id] !== e.isActive);
    if (changed.length === 0) return;
    setSaving(true);
    try {
      await Promise.all(
        changed.map((e) =>
          fetch(`/api/admin/events/${e.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isActive: draft[e.id] }),
          })
        )
      );
      setEvents((prev) =>
        prev.map((e) => ({ ...e, isActive: draft[e.id] ?? e.isActive }))
      );
      setToast({ message: "변경사항을 저장했어요" });
    } catch {
      setToast({ message: "저장 실패", sub: "다시 시도해주세요" });
    } finally {
      setSaving(false);
    }
  }

  // 그룹 변경은 즉시 저장 (스테이징 아님)
  async function changeGroup(eventId: string, groupId: string) {
    const gid = groupId || null;
    setEvents((prev) =>
      prev.map((e) =>
        e.id === eventId
          ? {
              ...e,
              groupId: gid,
              groupName: groups.find((g) => g.id === gid)?.name ?? null,
            }
          : e
      )
    );
    const res = await fetch(`/api/admin/events/${eventId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupId: gid }),
    });
    if (!res.ok) setToast({ message: "그룹 변경 실패" });
  }

  async function createEvent() {
    if (!newName.trim() || !newDate) {
      setToast({ message: "이름과 날짜를 입력하세요" });
      return;
    }
    if (!newGroupId) {
      setToast({ message: "그룹을 선택하세요" });
      return;
    }
    setCreating(true);
    const res = await fetch("/api/admin/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName, date: newDate, groupId: newGroupId }),
    });
    setCreating(false);
    if (!res.ok) {
      setToast({ message: "생성 실패" });
      return;
    }
    setNewName("");
    setNewDate("");
    setNewGroupId("");
    await loadEvents();
    setToast({ message: "행사를 만들었어요" });
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await fetch(`/api/admin/events/${deleteTarget.id}`, {
      method: "DELETE",
    });
    setDeleting(false);
    setDeleteTarget(null);
    if (!res.ok) {
      setToast({ message: "삭제 실패" });
      return;
    }
    await loadEvents();
    setToast({ message: "행사를 삭제했어요" });
  }

  async function copyEventLink(e: EventItem) {
    if (!e.code) return;
    const url = `${origin}/e/${e.code}`;
    try {
      await navigator.clipboard.writeText(url);
      setToast({ message: "행사 공유 링크를 복사했어요", sub: url });
    } catch {
      setToast({ message: "복사 실패", sub: url });
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-6 pb-28">
      <header className="flex items-center gap-3 mb-5">
        <button onClick={() => router.push("/admin")} className="text-gray-400">
          ←
        </button>
        <h1 className="text-xl font-bold flex-1">행사 관리</h1>
      </header>

      {/* 새 행사 생성 */}
      <details className="mb-5 bg-gray-900 rounded-xl p-4">
        <summary className="text-sm text-gray-300 cursor-pointer">
          ＋ 새 행사 만들기
        </summary>
        <div className="mt-3 space-y-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="행사 이름 (예: 바로 잠실 19:30)"
            className="w-full bg-gray-800 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 ring-indigo-500"
          />
          <input
            type="date"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            className="w-full bg-gray-800 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 ring-indigo-500"
          />
          <select
            value={newGroupId}
            onChange={(e) => setNewGroupId(e.target.value)}
            className="w-full bg-gray-800 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 ring-indigo-500"
          >
            <option value="">그룹 선택 (필수)</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
          {groups.length === 0 && (
            <p className="text-[11px] text-amber-400/90">
              먼저 &lsquo;그룹 관리&rsquo;에서 그룹을 만들어 주세요.
            </p>
          )}
          <button
            onClick={createEvent}
            disabled={creating}
            className="w-full bg-indigo-600 active:bg-indigo-700 text-white text-sm font-medium py-2.5 rounded-lg disabled:opacity-60"
          >
            {creating ? "생성 중..." : "행사 생성"}
          </button>
        </div>
      </details>

      {/* 그룹 필터 */}
      <div className="flex items-center gap-1.5 mb-2 overflow-x-auto pb-1">
        <FilterChip active={groupFilter === "all"} onClick={() => setGroupFilter("all")}>
          전체
        </FilterChip>
        {groups.map((g) => (
          <FilterChip
            key={g.id}
            active={groupFilter === g.id}
            onClick={() => setGroupFilter(g.id)}
          >
            {g.name}
          </FilterChip>
        ))}
        <FilterChip active={groupFilter === "none"} onClick={() => setGroupFilter("none")}>
          미지정
        </FilterChip>
      </div>

      {/* 정렬 컨트롤 */}
      <div className="flex items-center gap-1.5 mb-3">
        {SORTS.map((s) => (
          <button
            key={s.key}
            onClick={() => setSort(s.key)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              sort === s.key
                ? "bg-indigo-600 border-indigo-600 text-white"
                : "border-gray-700 text-gray-400 active:bg-gray-800"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center text-gray-500 py-16">불러오는 중...</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((e) => {
            const on = draft[e.id] ?? e.isActive;
            return (
              <div key={e.id} className="bg-gray-900 rounded-xl p-3">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <div
                      className={`font-medium text-sm truncate ${
                        !on ? "text-gray-500" : ""
                      }`}
                    >
                      {e.name}
                    </div>
                    <div className="text-gray-500 text-[11px] mt-0.5">
                      {new Date(e.date).toLocaleDateString("ko-KR")} ·{" "}
                      {e.photoCount}장
                    </div>
                  </div>
                  <button
                    onClick={() => toggleDraft(e.id)}
                    className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
                      on ? "bg-indigo-600" : "bg-gray-700"
                    }`}
                    aria-label={on ? "비공개로 전환" : "공개로 전환"}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                        on ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(e)}
                    className="w-8 h-8 flex items-center justify-center text-gray-500 active:text-red-400 shrink-0"
                    aria-label="행사 삭제"
                  >
                    🗑
                  </button>
                </div>

                {/* 그룹 선택 + 공유 링크 */}
                <div className="flex items-center gap-2 mt-2.5">
                  <select
                    value={e.groupId ?? ""}
                    onChange={(ev) => changeGroup(e.id, ev.target.value)}
                    className={`flex-1 min-w-0 text-xs rounded-lg px-2 py-2 outline-none ${
                      e.groupId
                        ? "bg-gray-800 text-gray-200"
                        : "bg-amber-950/60 text-amber-300"
                    }`}
                  >
                    <option value="">그룹 미지정</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => copyEventLink(e)}
                    disabled={!e.code}
                    className="text-xs font-medium px-3 py-2 rounded-lg bg-gray-800 active:bg-gray-700 text-gray-200 disabled:opacity-40 shrink-0"
                  >
                    링크
                  </button>
                  <button
                    onClick={() => setQrFor(e)}
                    disabled={!e.code}
                    className="text-xs font-medium px-3 py-2 rounded-lg bg-gray-800 active:bg-gray-700 text-gray-200 disabled:opacity-40 shrink-0"
                  >
                    QR
                  </button>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <p className="text-center text-gray-600 text-sm py-12">
              해당 조건의 행사가 없어요
            </p>
          )}
        </div>
      )}

      {/* 저장/취소 바 (변경 있을 때만) */}
      {dirty && (
        <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto p-4 bg-gray-950/95 backdrop-blur border-t border-gray-900 flex gap-2">
          <button
            onClick={cancelChanges}
            disabled={saving}
            className="flex-1 py-3 rounded-xl bg-gray-800 text-gray-300 text-sm font-medium disabled:opacity-60"
          >
            취소
          </button>
          <button
            onClick={saveChanges}
            disabled={saving}
            className="flex-1 py-3 rounded-xl bg-indigo-600 active:bg-indigo-700 text-white text-sm font-semibold disabled:opacity-60"
          >
            {saving ? "저장 중..." : "공개 설정 저장"}
          </button>
        </div>
      )}

      {/* 삭제 확인 모달 */}
      {deleteTarget && (
        <div className="fixed inset-0 z-40 bg-black/70 flex items-end sm:items-center justify-center">
          <div className="w-full max-w-md bg-gray-900 rounded-t-3xl sm:rounded-3xl p-5">
            <h3 className="font-semibold text-lg mb-1">행사 삭제</h3>
            <p className="text-sm text-gray-400 mb-2">
              <span className="text-white font-semibold">
                {deleteTarget.name}
              </span>
              을(를) 삭제할까요?
            </p>
            <p className="text-xs text-red-400/90 mb-4">
              ⚠️ 사진 {deleteTarget.photoCount}장도 함께 영구 삭제됩니다. 되돌릴 수
              없어요.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="flex-1 py-3 rounded-xl bg-gray-800 text-gray-300 text-sm font-medium disabled:opacity-60"
              >
                취소
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="flex-1 py-3 rounded-xl bg-red-600 active:bg-red-700 text-white text-sm font-semibold disabled:opacity-60"
              >
                {deleting ? "삭제 중..." : "영구 삭제"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 행사 QR 모달 */}
      {qrFor && qrFor.code && (
        <div
          className="fixed inset-0 z-40 bg-black/80 flex items-center justify-center p-6"
          onClick={() => setQrFor(null)}
        >
          <div
            className="bg-white rounded-3xl p-6 flex flex-col items-center gap-4"
            onClick={(ev) => ev.stopPropagation()}
          >
            <QRCodeSVG value={`${origin}/e/${qrFor.code}`} size={220} />
            <div className="text-center">
              <div className="text-black font-bold">{qrFor.name}</div>
              <div className="text-gray-500 text-xs mt-0.5">
                스캔하면 {qrFor.groupName ?? "그룹"} 행사가 열려요
              </div>
            </div>
            <button onClick={() => setQrFor(null)} className="text-gray-500 text-sm">
              닫기
            </button>
          </div>
        </div>
      )}

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`text-xs px-3 py-1.5 rounded-full border whitespace-nowrap transition-colors ${
        active
          ? "bg-gray-200 border-gray-200 text-gray-900"
          : "border-gray-700 text-gray-400 active:bg-gray-800"
      }`}
    >
      {children}
    </button>
  );
}
