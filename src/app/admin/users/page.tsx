"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

type Role = "PARTICIPANT" | "PHOTOGRAPHER" | "ADMIN";
type UserRow = {
  id: string;
  name: string | null;
  email: string | null;
  role: Role;
  instagram: string | null;
  createdAt: string;
  groupIds: string[];
};
type GroupOpt = { id: string; name: string };

const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "관리자",
  PHOTOGRAPHER: "작가",
  PARTICIPANT: "참가자",
};
const ROLE_COLOR: Record<Role, string> = {
  ADMIN: "bg-red-900/60 text-red-300",
  PHOTOGRAPHER: "bg-indigo-900/60 text-indigo-300",
  PARTICIPANT: "bg-gray-800 text-gray-400",
};

type ChangeItem = {
  userId: string;
  name: string | null;
  field: "role" | "instagram" | "group";
  before: string;
  after: string;
};

export default function AdminUsersPage() {
  const router = useRouter();
  const [origUsers, setOrigUsers] = useState<UserRow[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [groups, setGroups] = useState<GroupOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [instaDraft, setInstaDraft] = useState<Record<string, string>>({});
  const [origInstaDraft, setOrigInstaDraft] = useState<Record<string, string>>({});
  const [groupOpen, setGroupOpen] = useState<string | null>(null);
  const groupDropRef = useRef<HTMLDivElement>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [uRes, gRes] = await Promise.all([
      fetch("/api/admin/users"),
      fetch("/api/admin/groups"),
    ]);
    if (uRes.status === 403) {
      alert("관리자만 접근할 수 있습니다");
      router.push("/");
      return;
    }
    let u: UserRow[];
    try { u = await uRes.json(); } catch { setLoading(false); return; }
    setOrigUsers(u);
    setUsers(u);
    const insta = Object.fromEntries(u.map((x) => [x.id, x.instagram ?? ""]));
    setInstaDraft(insta);
    setOrigInstaDraft(insta);
    if (gRes.ok) {
      try { setGroups(await gRes.json()); } catch { /* 무시 */ }
    }
    setLoading(false);
  }, [router]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (groupDropRef.current && !groupDropRef.current.contains(e.target as Node))
        setGroupOpen(null);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function changeRole(userId: string, role: Role) {
    setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role } : u));
  }

  function changeGroup(userId: string, groupId: string, member: boolean) {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId
          ? {
              ...u,
              groupIds: member
                ? [...u.groupIds, groupId]
                : u.groupIds.filter((id) => id !== groupId),
            }
          : u
      )
    );
  }

  // 변경사항 계산
  function calcChanges(): ChangeItem[] {
    const changes: ChangeItem[] = [];
    const origMap = new Map(origUsers.map((u) => [u.id, u]));

    for (const u of users) {
      const orig = origMap.get(u.id);
      if (!orig) continue;

      if (u.role !== orig.role) {
        changes.push({
          userId: u.id,
          name: u.name,
          field: "role",
          before: ROLE_LABEL[orig.role],
          after: ROLE_LABEL[u.role],
        });
      }

      const instaAfter = instaDraft[u.id] ?? "";
      const instaBefore = origInstaDraft[u.id] ?? "";
      if (instaAfter !== instaBefore) {
        changes.push({
          userId: u.id,
          name: u.name,
          field: "instagram",
          before: instaBefore ? `@${instaBefore}` : "(없음)",
          after: instaAfter ? `@${instaAfter}` : "(없음)",
        });
      }

      const origGroupSet = new Set(orig.groupIds);
      const newGroupSet = new Set(u.groupIds);
      const groupName = (id: string) => groups.find((g) => g.id === id)?.name ?? id;
      const added = u.groupIds.filter((id) => !origGroupSet.has(id));
      const removed = orig.groupIds.filter((id) => !newGroupSet.has(id));
      for (const id of added)
        changes.push({ userId: u.id, name: u.name, field: "group", before: "", after: `+${groupName(id)}` });
      for (const id of removed)
        changes.push({ userId: u.id, name: u.name, field: "group", before: `-${groupName(id)}`, after: "" });
    }

    return changes;
  }

  const changes = calcChanges();
  const hasChanges = changes.length > 0;

  async function doSave() {
    setSaving(true);
    const origMap = new Map(origUsers.map((u) => [u.id, u]));
    const tasks: Promise<unknown>[] = [];

    for (const u of users) {
      const orig = origMap.get(u.id);
      if (!orig) continue;

      if (u.role !== orig.role) {
        tasks.push(
          fetch("/api/admin/users/role", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: u.id, role: u.role }),
          })
        );
      }

      const instaAfter = instaDraft[u.id] ?? "";
      if (instaAfter !== (origInstaDraft[u.id] ?? "")) {
        tasks.push(
          fetch("/api/admin/users/instagram", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: u.id, instagram: instaAfter }),
          })
        );
      }

      const origGroupSet = new Set(orig.groupIds);
      const newGroupSet = new Set(u.groupIds);
      for (const id of u.groupIds.filter((x) => !origGroupSet.has(x))) {
        tasks.push(
          fetch("/api/admin/users/groups", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: u.id, groupId: id, member: true }),
          })
        );
      }
      for (const id of orig.groupIds.filter((x) => !newGroupSet.has(x))) {
        tasks.push(
          fetch("/api/admin/users/groups", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: u.id, groupId: id, member: false }),
          })
        );
      }
    }

    await Promise.all(tasks);
    setSaving(false);
    setShowConfirm(false);
    await load();
  }

  const filtered = users.filter((u) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return [u.name, u.email, u.instagram].some((v) => v?.toLowerCase().includes(q));
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 pb-28">
      <header className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push("/admin")} className="text-gray-400 hover:text-white">←</button>
        <h1 className="text-xl font-bold">회원 관리</h1>
        <span className="text-gray-500 text-sm ml-1">({users.length}명)</span>
      </header>

      <div className="mb-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="이름, 이메일, 인스타 아이디로 검색"
          className="w-full max-w-sm bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-sm outline-none focus:border-indigo-500 placeholder-gray-600"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64 text-gray-500">불러오는 중...</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400 text-xs">
                <th className="text-left px-4 py-3 font-medium">이름</th>
                <th className="text-left px-4 py-3 font-medium">이메일 / 계정</th>
                <th className="text-left px-4 py-3 font-medium w-32">역할</th>
                <th className="text-left px-4 py-3 font-medium w-52">인스타 아이디</th>
                <th className="text-left px-4 py-3 font-medium w-32">소속 그룹</th>
                <th className="text-left px-4 py-3 font-medium w-24">가입일</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => {
                const orig = origUsers.find((o) => o.id === u.id);
                const roleDirty = orig && u.role !== orig.role;
                const instaDirty = (instaDraft[u.id] ?? "") !== (origInstaDraft[u.id] ?? "");
                const groupDirty = orig && JSON.stringify([...u.groupIds].sort()) !== JSON.stringify([...orig.groupIds].sort());
                const dirty = roleDirty || instaDirty || groupDirty;
                return (
                  <tr key={u.id} className={`border-b border-gray-800/60 hover:bg-gray-900/40 ${dirty ? "bg-yellow-900/10" : ""}`}>
                    <td className="px-4 py-3 font-medium">
                      {u.name ?? <span className="text-gray-600">이름 없음</span>}
                      {dirty && <span className="ml-1.5 text-[10px] text-yellow-400">●</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {u.email ?? <span className="text-gray-600">카카오 로그인</span>}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={u.role}
                        onChange={(e) => changeRole(u.id, e.target.value as Role)}
                        className={`text-xs rounded-lg px-2 py-1.5 outline-none cursor-pointer ${ROLE_COLOR[u.role]}`}
                      >
                        <option value="PARTICIPANT">참가자</option>
                        <option value="PHOTOGRAPHER">작가</option>
                        <option value="ADMIN">관리자</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center bg-gray-800 rounded-lg px-2 py-1 gap-1">
                        <span className="text-gray-500 text-xs">@</span>
                        <input
                          value={instaDraft[u.id] ?? ""}
                          onChange={(e) => setInstaDraft((p) => ({ ...p, [u.id]: e.target.value }))}
                          placeholder="instagram_id"
                          className="bg-transparent text-xs outline-none w-full min-w-0"
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3 relative">
                      <div className="relative" ref={groupOpen === u.id ? groupDropRef : null}>
                        <button
                          onClick={() => setGroupOpen(groupOpen === u.id ? null : u.id)}
                          className="flex items-center gap-1.5 text-xs bg-gray-800 hover:bg-gray-700 rounded-lg px-2.5 py-1.5"
                        >
                          <span className="text-indigo-400 font-semibold">{u.groupIds.length}</span>
                          <span className="text-gray-400">개</span>
                          <span className="text-gray-600 ml-0.5">▾</span>
                        </button>
                        {groupOpen === u.id && (
                          <div className="absolute z-50 top-full left-0 mt-1 w-48 bg-gray-900 border border-gray-700 rounded-xl shadow-xl py-1.5">
                            {groups.length === 0 ? (
                              <p className="text-xs text-gray-600 px-3 py-2">그룹이 없습니다</p>
                            ) : groups.map((g) => (
                              <label key={g.id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-800 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={u.groupIds.includes(g.id)}
                                  onChange={(e) => changeGroup(u.id, g.id, e.target.checked)}
                                  className="w-3.5 h-3.5 accent-indigo-500"
                                />
                                <span className="text-xs text-gray-300 truncate">{g.name}</span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {new Date(u.createdAt).toLocaleDateString("ko-KR", { year: "2-digit", month: "2-digit", day: "2-digit" })}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center text-gray-600 py-12 text-sm">
                    {query ? "검색 결과가 없어요" : "아직 가입한 유저가 없어요"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-gray-600 mt-5 leading-relaxed">
        역할을 &lsquo;작가&rsquo;로 바꾸고 <b>소속 그룹</b>을 지정하면, 그 그룹의 모든 행사에 사진을 올릴 수 있어요.
      </p>

      {/* 하단 저장 바 */}
      {hasChanges && (
        <div className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-between px-6 py-4 bg-gray-950 border-t border-gray-800 shadow-2xl">
          <span className="text-sm text-yellow-300">{changes.length}개 변경사항 있어요</span>
          <div className="flex gap-2">
            <button
              onClick={() => { load(); }}
              className="text-sm px-4 py-2 rounded-xl bg-gray-800 text-gray-300 active:bg-gray-700"
            >
              되돌리기
            </button>
            <button
              onClick={() => setShowConfirm(true)}
              className="text-sm px-5 py-2 rounded-xl bg-indigo-600 text-white font-medium active:bg-indigo-700"
            >
              저장
            </button>
          </div>
        </div>
      )}

      {/* 확인 팝업 */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 pb-0">
          <div className="w-full max-w-md bg-gray-900 rounded-t-2xl px-5 pt-5 pb-8 shadow-2xl">
            <h2 className="font-bold text-lg mb-1">변경사항 확인</h2>
            <p className="text-gray-400 text-sm mb-4">아래 내용을 저장할까요?</p>

            <div className="space-y-2 max-h-64 overflow-y-auto mb-5">
              {changes.map((c, i) => (
                <div key={i} className="flex items-start gap-3 bg-gray-800 rounded-xl px-4 py-3 text-sm">
                  <span className="font-medium text-white shrink-0">{c.name ?? "이름 없음"}</span>
                  <span className="text-gray-400 shrink-0">
                    {c.field === "role" ? "역할" : c.field === "instagram" ? "인스타" : "그룹"}
                  </span>
                  <span className="ml-auto flex items-center gap-2 text-xs">
                    {c.before && <span className="text-red-400 line-through">{c.before}</span>}
                    {c.before && c.after && <span className="text-gray-600">→</span>}
                    {c.after && <span className="text-green-400">{c.after}</span>}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-3 rounded-xl bg-gray-800 text-gray-300 text-sm active:bg-gray-700"
              >
                취소
              </button>
              <button
                onClick={doSave}
                disabled={saving}
                className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-semibold text-sm active:bg-indigo-700 disabled:opacity-50"
              >
                {saving ? "저장 중..." : "저장하기"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
