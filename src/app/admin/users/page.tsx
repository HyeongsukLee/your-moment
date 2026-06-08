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

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [groups, setGroups] = useState<GroupOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [instaDraft, setInstaDraft] = useState<Record<string, string>>({});
  // 그룹 드롭다운 열린 userId
  const [groupOpen, setGroupOpen] = useState<string | null>(null);
  const groupDropRef = useRef<HTMLDivElement>(null);

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
    try {
      u = await uRes.json();
    } catch {
      setLoading(false);
      return;
    }
    setUsers(u);
    setInstaDraft(Object.fromEntries(u.map((x) => [x.id, x.instagram ?? ""])));
    if (gRes.ok) {
      try { setGroups(await gRes.json()); } catch { /* 무시 */ }
    }
    setLoading(false);
  }, [router]);

  useEffect(() => { load(); }, [load]);

  // 드롭다운 외부 클릭 시 닫기
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (groupDropRef.current && !groupDropRef.current.contains(e.target as Node)) {
        setGroupOpen(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function setRole(userId: string, role: Role) {
    const res = await fetch("/api/admin/users/role", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, role }),
    });
    if (!res.ok) {
      const e = await res.json();
      alert(e.error ?? "변경 실패");
      return;
    }
    await load();
  }

  async function saveInstagram(userId: string) {
    await fetch("/api/admin/users/instagram", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, instagram: instaDraft[userId] ?? "" }),
    });
    await load();
  }

  async function toggleGroup(userId: string, groupId: string, member: boolean) {
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
    await fetch("/api/admin/users/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, groupId, member }),
    });
  }

  const filtered = users.filter((u) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return [u.name, u.email, u.instagram].some((v) =>
      v?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <header className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push("/admin")} className="text-gray-400 hover:text-white">
          ←
        </button>
        <h1 className="text-xl font-bold">회원 관리</h1>
        <span className="text-gray-500 text-sm ml-1">({users.length}명)</span>
      </header>

      {/* 검색 */}
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
        <div className="flex items-center justify-center h-64 text-gray-500">
          불러오는 중...
        </div>
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
              {filtered.map((u) => (
                <tr key={u.id} className="border-b border-gray-800/60 hover:bg-gray-900/40">
                  {/* 이름 */}
                  <td className="px-4 py-3 font-medium">{u.name ?? <span className="text-gray-600">이름 없음</span>}</td>

                  {/* 이메일 */}
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {u.email ?? <span className="text-gray-600">카카오 로그인</span>}
                  </td>

                  {/* 역할 */}
                  <td className="px-4 py-3">
                    <select
                      value={u.role}
                      onChange={(e) => setRole(u.id, e.target.value as Role)}
                      className={`text-xs rounded-lg px-2 py-1.5 outline-none cursor-pointer ${ROLE_COLOR[u.role]}`}
                    >
                      <option value="PARTICIPANT">참가자</option>
                      <option value="PHOTOGRAPHER">작가</option>
                      <option value="ADMIN">관리자</option>
                    </select>
                  </td>

                  {/* 인스타 */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <div className="flex items-center bg-gray-800 rounded-lg px-2 py-1 gap-1 flex-1 min-w-0">
                        <span className="text-gray-500 text-xs">@</span>
                        <input
                          value={instaDraft[u.id] ?? ""}
                          onChange={(e) =>
                            setInstaDraft((p) => ({ ...p, [u.id]: e.target.value }))
                          }
                          placeholder="instagram_id"
                          className="bg-transparent text-xs outline-none w-full min-w-0"
                        />
                      </div>
                      <button
                        onClick={() => saveInstagram(u.id)}
                        disabled={(instaDraft[u.id] ?? "") === (u.instagram ?? "")}
                        className="text-xs px-2 py-1 rounded-lg bg-indigo-600 active:bg-indigo-700 text-white disabled:opacity-30 shrink-0"
                      >
                        저장
                      </button>
                    </div>
                  </td>

                  {/* 그룹 */}
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
                          ) : (
                            groups.map((g) => {
                              const on = u.groupIds.includes(g.id);
                              return (
                                <label
                                  key={g.id}
                                  className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-800 cursor-pointer"
                                >
                                  <input
                                    type="checkbox"
                                    checked={on}
                                    onChange={(e) => toggleGroup(u.id, g.id, e.target.checked)}
                                    className="w-3.5 h-3.5 accent-indigo-500"
                                  />
                                  <span className="text-xs text-gray-300 truncate">{g.name}</span>
                                </label>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* 가입일 */}
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {new Date(u.createdAt).toLocaleDateString("ko-KR", {
                      year: "2-digit",
                      month: "2-digit",
                      day: "2-digit",
                    })}
                  </td>
                </tr>
              ))}
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
        관리자·작가 모두 <b>인스타 아이디</b>를 등록하면 찾은 사진의 촬영자 출처로 표시됩니다.
      </p>
    </div>
  );
}
