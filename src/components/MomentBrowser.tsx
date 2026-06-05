"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export type Moment = {
  id: string;
  name: string;
  description: string | null;
  date: string; // ISO
  photoCount: number;
  coverUrl: string | null;
  coverPosition: string | null; // "x% y%"
};

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const CAL_ROWS = 6; // 항상 6주로 고정해 달마다 높이가 변하지 않게 함

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export default function MomentBrowser({ moments }: { moments: Moment[] }) {
  const router = useRouter();
  const listRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const [highlightId, setHighlightId] = useState<string | null>(null);

  // 날짜(YYYY-MM-DD) → moment 매핑
  const byDate = useMemo(() => {
    const map = new Map<string, Moment>();
    for (const m of moments) map.set(ymd(new Date(m.date)), m);
    return map;
  }, [moments]);

  // 가장 최근 순간이 있는 달을 기본으로 표시
  const initial = moments.length ? new Date(moments[0].date) : new Date();
  const [cursor, setCursor] = useState(
    new Date(initial.getFullYear(), initial.getMonth(), 1)
  );

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // 항상 42칸(6주) 고정 — 앞쪽 빈칸 + 날짜 + 뒤쪽 빈칸
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length < CAL_ROWS * 7) cells.push(null);

  function selectDate(day: number) {
    const m = byDate.get(ymd(new Date(year, month, day)));
    if (!m) return;
    // 카드 순서는 그대로 두고, 해당 카드 위치로 스크롤
    const el = cardRefs.current.get(m.id);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
    setHighlightId(m.id);
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* 고정 크기 캘린더 박스 (6주 고정) */}
      <div className="shrink-0 bg-gray-900 border border-gray-800 rounded-2xl px-3 py-3 mb-3">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => setCursor(new Date(year, month - 1, 1))}
            className="w-7 h-7 rounded-lg text-gray-400 active:bg-gray-800"
          >
            ‹
          </button>
          <span className="font-semibold text-sm">
            {year}년 {month + 1}월
          </span>
          <button
            onClick={() => setCursor(new Date(year, month + 1, 1))}
            className="w-7 h-7 rounded-lg text-gray-400 active:bg-gray-800"
          >
            ›
          </button>
        </div>

        <div className="grid grid-cols-7 gap-0.5 text-center mb-0.5">
          {WEEKDAYS.map((w, i) => (
            <div
              key={w}
              className={`text-[10px] ${
                i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-gray-500"
              }`}
            >
              {w}
            </div>
          ))}
        </div>

        {/* 6주 고정 그리드 */}
        <div className="grid grid-cols-7 grid-rows-6 gap-0.5 text-center">
          {cells.map((day, idx) => {
            if (day === null) return <div key={`e-${idx}`} className="h-7" />;
            const key = ymd(new Date(year, month, day));
            const m = byDate.get(key);
            const has = !!m;
            return (
              <button
                key={key}
                onClick={() => selectDate(day)}
                disabled={!has}
                className={`h-7 rounded-md text-xs flex items-center justify-center relative transition-colors ${
                  has
                    ? "bg-indigo-600/80 text-white font-semibold active:bg-indigo-700"
                    : "text-gray-600"
                }`}
              >
                {day}
                {has && (
                  <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-white/80" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 스크롤되는 카드 리스트 — 항상 최신순 고정 */}
      <div ref={listRef} className="flex-1 overflow-y-auto space-y-3 pb-6 -mx-1 px-1">
        {moments.map((m) => {
          const d = new Date(m.date);
          const isHighlighted = m.id === highlightId;
          return (
            <button
              key={m.id}
              ref={(el) => {
                if (el) cardRefs.current.set(m.id, el);
                else cardRefs.current.delete(m.id);
              }}
              onClick={() => router.push(`/events/${m.id}`)}
              className={`block w-full text-left bg-gray-900 rounded-2xl overflow-hidden active:scale-[0.98] transition-all ${
                isHighlighted ? "ring-2 ring-indigo-500" : ""
              }`}
            >
              <div className="h-32 relative bg-gradient-to-br from-indigo-900 to-purple-900 flex items-center justify-center">
                {m.coverUrl ? (
                  <Image
                    src={m.coverUrl}
                    alt=""
                    fill
                    className="object-cover"
                    style={{ objectPosition: m.coverPosition ?? "50% 50%" }}
                    sizes="(max-width: 448px) 100vw, 448px"
                  />
                ) : (
                  <span className="text-3xl">📸</span>
                )}
              </div>
              <div className="p-4">
                <h2 className="font-semibold text-lg">{m.name}</h2>
                <p className="text-gray-400 text-sm mt-1">
                  {d.toLocaleDateString("ko-KR", {
                    month: "long",
                    day: "numeric",
                    weekday: "short",
                  })}{" "}
                  · {m.photoCount.toLocaleString()}장
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
