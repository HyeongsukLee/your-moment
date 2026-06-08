"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

type Role = "PARTICIPANT" | "PHOTOGRAPHER" | "ADMIN";
type UserRow = {
  id: string;
  name: string | null;
  email: string | null;
  role: Role;
  instagram: string | null;
  groupIds: string[];
};
type GroupOpt = { id: string; name: string };

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [groups, setGroups] = useState<GroupOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [instaDraft, setInstaDraft] = useState<Record<string, string>>({});

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
    const u: UserRow[] = await uRes.json();
    setUsers(u);
    setInstaDraft(Object.fromEntries(u.map((x) => [x.id, x.instagram ?? ""])));
    if (gRes.ok) setGroups(await gRes.json());
    setLoading(false);
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

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
    // 낙관적 업데이트
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

  return (
    <div className="max-w-md mx-auto px-4 py-6">
      <header className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push("/admin")} className="text-gray-400">
          ←
        </button>
        <h1 className="text-xl font-bold">작가 관리</h1>
      </header>

      {loading ? (
        <div className="flex items-center justify-center h-64 text-gray-500">
          불러오는 중...
        </div>
      ) : (
        <div className="space-y-2">
          {users.map((u) => (
            <div key={u.id} className="bg-gray-900 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3">
                <div className="min-w-0">
                  <div className="font-medium truncate">
                    {u.name ?? "이름 없음"}
                  </div>
                  <div className="text-gray-500 text-xs truncate">
                    {u.email ?? "카카오 로그인"}
                  </div>
                </div>
                <select
                  value={u.role}
                  onChange={(e) => setRole(u.id, e.target.value as Role)}
                  className={`text-xs rounded-lg px-2 py-1.5 outline-none ${
                    u.role === "ADMIN"
                      ? "bg-red-900/60 text-red-300"
                      : u.role === "PHOTOGRAPHER"
                        ? "bg-indigo-900/60 text-indigo-300"
                        : "bg-gray-800 text-gray-400"
                  }`}
                >
                  <option value="PARTICIPANT">참가자</option>
                  <option value="PHOTOGRAPHER">작가</option>
                  <option value="ADMIN">관리자</option>
                </select>
              </div>

              {/* 작가/관리자: 인스타 + 그룹 소속 */}
              {(u.role === "PHOTOGRAPHER" || u.role === "ADMIN") && (
                <div className="border-t border-gray-800 px-4 py-3 space-y-3">
                  {/* 인스타 아이디 */}
                  <div>
                    <label className="text-xs text-gray-400">
                      인스타 아이디 (사진 출처 표시)
                    </label>
                    <div className="flex gap-2 mt-1.5">
                      <div className="flex-1 flex items-center bg-gray-800 rounded-lg px-2.5">
                        <span className="text-gray-500 text-sm">@</span>
                        <input
                          value={instaDraft[u.id] ?? ""}
                          onChange={(e) =>
                            setInstaDraft((p) => ({
                              ...p,
                              [u.id]: e.target.value,
                            }))
                          }
                          placeholder="instagram_id"
                          className="flex-1 bg-transparent py-2 text-sm outline-none"
                        />
                      </div>
                      <button
                        onClick={() => saveInstagram(u.id)}
                        disabled={(instaDraft[u.id] ?? "") === (u.instagram ?? "")}
                        className="text-xs font-medium px-3 rounded-lg bg-indigo-600 active:bg-indigo-700 text-white disabled:opacity-40"
                      >
                        저장
                      </button>
                    </div>
                  </div>

                  {/* 그룹 소속 (업로드 권한) */}
                  <div>
                    <button
                      onClick={() => setExpanded(expanded === u.id ? null : u.id)}
                      className="w-full flex items-center justify-between text-sm text-gray-300"
                    >
                      <span>
                        소속 그룹{" "}
                        <span className="text-indigo-400 font-semibold">
                          {u.groupIds.length}
                        </span>
                        개{" "}
                        <span className="text-gray-600 text-xs">
                          (그룹 행사 업로드 가능)
                        </span>
                      </span>
                      <span className="text-gray-500">
                        {expanded === u.id ? "▲" : "▼"}
                      </span>
                    </button>

                    {expanded === u.id && (
                      <div className="mt-2 space-y-1.5">
                        {groups.map((g) => {
                          const on = u.groupIds.includes(g.id);
                          return (
                            <label
                              key={g.id}
                              className="flex items-center gap-2 text-sm py-1"
                            >
                              <input
                                type="checkbox"
                                checked={on}
                                onChange={(e) =>
                                  toggleGroup(u.id, g.id, e.target.checked)
                                }
                                className="w-4 h-4 accent-indigo-500"
                              />
                              <span className="flex-1">{g.name}</span>
                            </label>
                          );
                        })}
                        {groups.length === 0 && (
                          <p className="text-xs text-gray-600">
                            그룹이 없습니다. 먼저 그룹을 만들어주세요.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
          {users.length === 0 && (
            <p className="text-center text-gray-600 text-sm py-12">
              아직 가입한 유저가 없어요
            </p>
          )}
        </div>
      )}

      <p className="text-xs text-gray-600 mt-6 leading-relaxed">
        역할을 &lsquo;작가&rsquo;로 바꾸고 <b>소속 그룹</b>을 지정하면, 그 그룹의 모든 행사에
        사진을 올릴 수 있어요. 관리자·작가 모두 <b>인스타 아이디</b>를 등록하면 찾은 사진의
        촬영자 출처로 표시됩니다.
      </p>
    </div>
  );
}
