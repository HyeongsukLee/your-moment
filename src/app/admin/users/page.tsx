"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

type Role = "PARTICIPANT" | "PHOTOGRAPHER" | "ADMIN";
type UserRow = {
  id: string;
  name: string | null;
  email: string | null;
  role: Role;
  assignedEventIds: string[];
};
type EventOpt = { id: string; name: string; date: string };

const roleLabel: Record<Role, string> = {
  PARTICIPANT: "참가자",
  PHOTOGRAPHER: "작가",
  ADMIN: "관리자",
};

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [events, setEvents] = useState<EventOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [uRes, eRes] = await Promise.all([
      fetch("/api/admin/users"),
      fetch("/api/admin/events"),
    ]);
    if (uRes.status === 403) {
      alert("관리자만 접근할 수 있습니다");
      router.push("/");
      return;
    }
    setUsers(await uRes.json());
    setEvents(await eRes.json());
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

  async function toggleAssign(userId: string, eventId: string, assigned: boolean) {
    // 낙관적 업데이트
    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId
          ? {
              ...u,
              assignedEventIds: assigned
                ? [...u.assignedEventIds, eventId]
                : u.assignedEventIds.filter((id) => id !== eventId),
            }
          : u
      )
    );
    await fetch("/api/admin/users/assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, eventId, assigned }),
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
                  <div className="text-gray-500 text-xs truncate">{u.email}</div>
                </div>
                {/* 역할 선택 */}
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

              {/* 작가면 행사 배정 영역 */}
              {u.role === "PHOTOGRAPHER" && (
                <div className="border-t border-gray-800 px-4 py-3">
                  <button
                    onClick={() =>
                      setExpanded(expanded === u.id ? null : u.id)
                    }
                    className="w-full flex items-center justify-between text-sm text-gray-300"
                  >
                    <span>
                      담당 행사{" "}
                      <span className="text-indigo-400 font-semibold">
                        {u.assignedEventIds.length}
                      </span>
                      개
                    </span>
                    <span className="text-gray-500">
                      {expanded === u.id ? "▲" : "▼"}
                    </span>
                  </button>

                  {expanded === u.id && (
                    <div className="mt-3 space-y-1.5">
                      {events.map((ev) => {
                        const on = u.assignedEventIds.includes(ev.id);
                        return (
                          <label
                            key={ev.id}
                            className="flex items-center gap-2 text-sm py-1"
                          >
                            <input
                              type="checkbox"
                              checked={on}
                              onChange={(e) =>
                                toggleAssign(u.id, ev.id, e.target.checked)
                              }
                              className="w-4 h-4 accent-indigo-500"
                            />
                            <span className="flex-1">{ev.name}</span>
                            <span className="text-gray-600 text-xs">
                              {new Date(ev.date).toLocaleDateString("ko-KR")}
                            </span>
                          </label>
                        );
                      })}
                      {events.length === 0 && (
                        <p className="text-xs text-gray-600">
                          행사가 없습니다. 먼저 행사를 만들어주세요.
                        </p>
                      )}
                    </div>
                  )}
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
        역할을 &lsquo;작가&rsquo;로 바꾸면 담당 행사를 배정할 수 있어요. 작가는
        배정된 행사에만 사진을 올릴 수 있습니다.
      </p>
    </div>
  );
}
