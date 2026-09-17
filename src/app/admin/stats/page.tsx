"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

type Row = {
  id: string;
  name: string | null;
  email: string | null;
  logins: number;
  visits: number;
  searches: number;
  downloads: number;
  lastActive: string | null;
};

type Summary =
  | {
      mode: "all";
      participants: number;
      totalLogins: number;
      totalSearches: number;
      downloads: number;
    }
  | {
      mode: "event";
      visitors: number;
      totalViews: number;
      searchers: number;
      totalSearches: number;
      downloads: number;
      downloaders: number;
      photoCount: number;
    };

type EventOpt = { id: string; name: string; date: string };
type SortKey = "logins" | "visits" | "searches" | "downloads" | "lastActive" | "name";

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

function SortableTh({
  label,
  sortKey,
  sort,
  order,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  sort: SortKey;
  order: "asc" | "desc";
  onSort: (key: SortKey) => void;
}) {
  const active = sort === sortKey;
  return (
    <th className="px-4 py-3 font-medium text-right">
      <button
        onClick={() => onSort(sortKey)}
        className={active ? "text-white" : "hover:text-gray-200"}
      >
        {label}
        {active && <span className="ml-1">{order === "desc" ? "↓" : "↑"}</span>}
      </button>
    </th>
  );
}

function Card({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="bg-gray-900 rounded-xl p-4">
      <p className="text-gray-400 text-xs mb-1">{label}</p>
      <p className="text-2xl font-semibold">{value.toLocaleString()}</p>
      {sub && <p className="text-gray-500 text-xs mt-1">{sub}</p>}
    </div>
  );
}

export default function AdminStatsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<EventOpt[]>([]);
  const [eventId, setEventId] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("downloads");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [loading, setLoading] = useState(true);

  // 행사 목록은 한 번만 (드롭다운용)
  useEffect(() => {
    fetch("/api/admin/events?all=1")
      .then((r) => (r.ok ? r.json() : []))
      .then(setEvents)
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ sort, order });
    if (eventId) params.set("eventId", eventId);
    if (query.trim()) params.set("q", query.trim());

    const res = await fetch(`/api/admin/stats?${params}`);
    if (res.status === 403) {
      alert("관리자만 접근할 수 있습니다");
      router.push("/");
      return;
    }
    try {
      const data = await res.json();
      setRows(data.rows);
      setSummary(data.summary);
    } catch {
      /* 무시 */
    }
    setLoading(false);
  }, [eventId, query, sort, order, router]);

  // 검색어는 입력이 멈춘 뒤에 조회
  useEffect(() => {
    const t = setTimeout(load, query ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, query]);

  function toggleSort(key: SortKey) {
    if (sort === key) {
      setOrder((o) => (o === "desc" ? "asc" : "desc"));
    } else {
      setSort(key);
      setOrder("desc");
    }
  }

  const isEvent = summary?.mode === "event";

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 pb-28">
      <header className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push("/admin")} className="text-gray-400 hover:text-white">
          ←
        </button>
        <h1 className="text-xl font-bold">활동 통계</h1>
      </header>

      <div className="flex flex-wrap items-center gap-3 mb-5">
        <select
          value={eventId}
          onChange={(e) => setEventId(e.target.value)}
          className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500"
        >
          <option value="">전체</option>
          {events.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="이름, 이메일로 검색"
          className="flex-1 max-w-sm bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-sm outline-none focus:border-indigo-500 placeholder-gray-600"
        />
      </div>

      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {summary.mode === "all" ? (
            <>
              <Card label="참가자" value={summary.participants} />
              <Card label="총 로그인" value={summary.totalLogins} />
              <Card label="총 검색" value={summary.totalSearches} />
              <Card label="다운로드" value={summary.downloads} />
            </>
          ) : (
            <>
              <Card
                label="방문자"
                value={summary.visitors}
                sub={`총 조회 ${summary.totalViews.toLocaleString()}`}
              />
              <Card
                label="검색한 사람"
                value={summary.searchers}
                sub={`총 검색 ${summary.totalSearches.toLocaleString()}`}
              />
              <Card
                label="다운로드"
                value={summary.downloads}
                sub={`받은 사람 ${summary.downloaders.toLocaleString()}`}
              />
              <Card label="사진" value={summary.photoCount} />
            </>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64 text-gray-500">불러오는 중...</div>
      ) : rows.length === 0 ? (
        <div className="flex items-center justify-center h-64 text-gray-500">
          해당하는 참가자가 없습니다
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400 text-xs">
                <th className="text-left px-4 py-3 font-medium">참가자</th>
                <SortableTh
                  label={isEvent ? "방문" : "로그인"}
                  sortKey={isEvent ? "visits" : "logins"}
                  sort={sort}
                  order={order}
                  onSort={toggleSort}
                />
                <SortableTh label="검색" sortKey="searches" sort={sort} order={order} onSort={toggleSort} />
                <SortableTh label="다운로드" sortKey="downloads" sort={sort} order={order} onSort={toggleSort} />
                <SortableTh label="마지막 활동" sortKey="lastActive" sort={sort} order={order} onSort={toggleSort} />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const inactive = r.downloads === 0 && r.searches === 0;
                return (
                  <tr
                    key={r.id}
                    className={`border-b border-gray-800/60 last:border-0 ${
                      inactive ? "text-gray-500" : ""
                    }`}
                  >
                    <td className="px-4 py-3">
                      <span className={inactive ? "" : "text-white"}>{r.name ?? "이름 없음"}</span>
                      {r.email && (
                        <span className="block text-gray-600 text-xs">{r.email}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">{isEvent ? r.visits : r.logins}</td>
                    <td className="px-4 py-3 text-right">{r.searches}</td>
                    <td
                      className={`px-4 py-3 text-right ${
                        r.downloads > 0 ? "font-semibold text-white" : ""
                      }`}
                    >
                      {r.downloads}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-400">{fmtDate(r.lastActive)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
