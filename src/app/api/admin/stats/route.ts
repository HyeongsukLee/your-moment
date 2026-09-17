import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";

type SortKey = "logins" | "visits" | "searches" | "downloads" | "lastActive" | "name";

/** userId → 집계값 맵으로 변환 (groupBy 결과 병합용) */
function toMap(
  rows: { userId: string; _count: { _all: number }; _max: { createdAt: Date | null } }[]
) {
  return new Map(rows.map((r) => [r.userId, { count: r._count._all, last: r._max.createdAt }]));
}

function latest(...dates: (Date | null | undefined)[]): Date | null {
  const valid = dates.filter((d): d is Date => !!d);
  if (valid.length === 0) return null;
  return valid.reduce((a, b) => (a > b ? a : b));
}

/**
 * 관리자: 참가자 활동 통계.
 *
 * ?eventId=... 를 주면 그 행사 범위로 좁힌다.
 *  - 전체 모드: 로그인 / 검색 / 다운로드
 *  - 행사 모드: 방문(EVENT_VIEW) / 검색 / 다운로드  ※ 로그인은 전역 이벤트라 행사에 귀속되지 않음
 *
 * 유저당 쿼리를 도는 대신 유형별 groupBy 결과를 메모리에서 병합한다 (N+1 방지).
 */
export async function GET(req: Request) {
  const session = await requireAdmin();
  if (!session) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const eventId = url.searchParams.get("eventId") || null;
  const q = (url.searchParams.get("q") || "").trim().toLowerCase();
  const sort = (url.searchParams.get("sort") || "downloads") as SortKey;
  const order = url.searchParams.get("order") === "asc" ? "asc" : "desc";
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const pageSize = Math.min(200, Math.max(10, Number(url.searchParams.get("pageSize")) || 50));

  const scope = eventId ? { eventId } : {};

  const [participants, loginRows, viewRows, downloadRows, searchRows, photoCount] =
    await Promise.all([
      db.user.findMany({
        where: { role: "PARTICIPANT" },
        select: { id: true, name: true, email: true, createdAt: true },
      }),
      // 로그인은 전역 지표 — 행사 필터를 적용하지 않는다
      db.activityLog.groupBy({
        by: ["userId"],
        where: { type: "LOGIN" },
        _count: { _all: true },
        _max: { createdAt: true },
      }),
      db.activityLog.groupBy({
        by: ["userId"],
        where: { type: "EVENT_VIEW", ...scope },
        _count: { _all: true },
        _max: { createdAt: true },
      }),
      db.activityLog.groupBy({
        by: ["userId"],
        where: { type: "DOWNLOAD", ...scope },
        _count: { _all: true },
        _max: { createdAt: true },
      }),
      db.search.groupBy({
        by: ["userId"],
        where: scope,
        _count: { _all: true },
        _max: { createdAt: true },
      }),
      eventId ? db.photo.count({ where: { eventId } }) : Promise.resolve(0),
    ]);

  const logins = toMap(loginRows);
  const views = toMap(viewRows);
  const downloads = toMap(downloadRows);
  const searches = toMap(searchRows);

  const rows = participants.map((u) => {
    const login = logins.get(u.id);
    const view = views.get(u.id);
    const dl = downloads.get(u.id);
    const se = searches.get(u.id);
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      createdAt: u.createdAt,
      logins: login?.count ?? 0,
      visits: view?.count ?? 0,
      searches: se?.count ?? 0,
      downloads: dl?.count ?? 0,
      lastActive: latest(login?.last, view?.last, dl?.last, se?.last),
    };
  });

  // 요약: 참가자 범위 밖(작가·관리자)의 활동은 제외하지 않고 전체 합계를 낸다.
  // 표는 참가자만 보여주지만, 카드의 "총 다운로드"는 실제 발생량이어야 하기 때문.
  const [totalLogins, totalViews, totalDownloads, totalSearches] = await Promise.all([
    db.activityLog.count({ where: { type: "LOGIN" } }),
    db.activityLog.count({ where: { type: "EVENT_VIEW", ...scope } }),
    db.activityLog.count({ where: { type: "DOWNLOAD", ...scope } }),
    db.search.count({ where: scope }),
  ]);

  const summary = eventId
    ? {
        mode: "event" as const,
        visitors: viewRows.length,
        totalViews,
        searchers: searchRows.length,
        totalSearches,
        downloads: totalDownloads,
        downloaders: downloadRows.length,
        photoCount,
      }
    : {
        mode: "all" as const,
        participants: participants.length,
        totalLogins,
        totalSearches,
        downloads: totalDownloads,
      };

  const filtered = q
    ? rows.filter(
        (r) =>
          (r.name ?? "").toLowerCase().includes(q) ||
          (r.email ?? "").toLowerCase().includes(q)
      )
    : rows;

  const dir = order === "asc" ? 1 : -1;
  filtered.sort((a, b) => {
    if (sort === "name") return dir * (a.name ?? "").localeCompare(b.name ?? "");
    if (sort === "lastActive") {
      return dir * ((a.lastActive?.getTime() ?? 0) - (b.lastActive?.getTime() ?? 0));
    }
    const diff = dir * (a[sort] - b[sort]);
    // 동점이면 이름순으로 고정해 페이지 간 순서가 흔들리지 않게 한다
    return diff !== 0 ? diff : (a.name ?? "").localeCompare(b.name ?? "");
  });

  const start = (page - 1) * pageSize;

  return Response.json({
    summary,
    total: filtered.length,
    page,
    pageSize,
    rows: filtered.slice(start, start + pageSize),
  });
}
