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

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

type CalCell = { day: number; monthOffset: -1 | 0 | 1 };

export default function MomentBrowser({ moments }: { moments: Moment[] }) {
  const router = useRouter();

  const listRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const today = useMemo(() => new Date(), []);
  const todayKey = ymd(today);

  // 날짜(YYYY-MM-DD) → moment 매핑
  const byDate = useMemo(() => {
    const map = new Map<string, Moment>();
    for (const m of moments) map.set(ymd(new Date(m.date)), m);
    return map;
  }, [moments]);

  // 기본은 오늘의 달을 표시
  const [cursor, setCursor] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();

  const cells: CalCell[] = [];
  // 앞쪽 빈칸 → 전달 날짜
  for (let i = firstDay - 1; i >= 0; i--)
    cells.push({ day: prevMonthDays - i, monthOffset: -1 });
  // 이번달
  for (let d = 1; d <= daysInMonth; d++)
    cells.push({ day: d, monthOffset: 0 });
  // 뒤쪽 빈칸 → 다음달 날짜 (행 맞춤)
  const calRows = Math.ceil(cells.length / 7);
  let nextDay = 1;
  while (cells.length < calRows * 7)
    cells.push({ day: nextDay++, monthOffset: 1 });

  function scrollToMoment(m: Moment) {
    cardRefs.current.get(m.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setHighlightId(m.id);
  }

  // 기준일(<= dateKey) 중 가장 최신 행사 (moments는 최신순 정렬)
  function mostRecentPast(dateKey: string): Moment | null {
    const target = new Date(dateKey).getTime();
    for (const m of moments) {
      if (new Date(ymd(new Date(m.date))).getTime() <= target) return m;
    }
    return null;
  }

  function pickDate(key: string) {
    setSelectedDate(key);
    const m = byDate.get(key);
    if (m) scrollToMoment(m);
    else {
      const past = mostRecentPast(key);
      if (past) scrollToMoment(past);
    }
  }

  function goToday() {
    setCursor(new Date(today.getFullYear(), today.getMonth(), 1));
    pickDate(todayKey);
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* 캘린더 (5~6행 동적, 전달·다음달 날짜 채움) */}
      <div className="shrink-0 bg-gray-900 border border-gray-800 rounded-2xl px-3 py-2 mb-2">
        <div className="flex items-center justify-between mb-1.5">
          <button
            onClick={() => setCursor(new Date(year, month - 1, 1))}
            className="w-7 h-7 rounded-lg text-gray-400 active:bg-gray-800"
          >
            ‹
          </button>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">
              {year}년 {month + 1}월
            </span>
            <button
              onClick={goToday}
              className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-600/20 text-indigo-300 border border-indigo-700/50 active:bg-indigo-600/40"
            >
              오늘
            </button>
          </div>
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

        {/* 날짜 그리드: 6행 높이 고정, 5행일 땐 행 높이 늘려서 채움 */}
        <div style={{ height: `${6 * 24 + 5 * 2}px` }}>
        <div
          className="grid grid-cols-7 gap-0.5 text-center h-full"
          style={{ gridTemplateRows: `repeat(${calRows}, 1fr)` }}
        >
          {cells.map(({ day, monthOffset }, idx) => {
            const cellDate = new Date(year, month + monthOffset, day);
            const key = ymd(cellDate);
            const isCurrent = monthOffset === 0;
            const isEvent = byDate.has(key);
            const isToday = key === todayKey;
            const isSelected = key === selectedDate;
            return (
              <button
                key={`${key}-${idx}`}
                onClick={() => {
                  if (monthOffset === -1) setCursor(new Date(year, month - 1, 1));
                  else if (monthOffset === 1) setCursor(new Date(year, month + 1, 1));
                  pickDate(key);
                }}
                className={`h-6 rounded-md text-xs flex items-center justify-center relative transition-colors ${
                  isSelected
                    ? "bg-indigo-600 text-white font-bold"
                    : isEvent && isCurrent
                      ? "bg-gray-700 text-white font-medium active:bg-gray-600"
                      : isCurrent
                        ? "text-gray-500 active:bg-gray-800"
                        : "text-gray-700 active:bg-gray-800"
                }`}
              >
                {day}
                {/* 점 표시: 이번달만 */}
                {isCurrent && (isEvent || isToday) && (
                  <span
                    className={`absolute bottom-0.5 w-1 h-1 rounded-full ${
                      isSelected ? "bg-white" : isToday ? "bg-red-500" : "bg-gray-400"
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>
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
              className={`relative block w-full text-left rounded-2xl overflow-hidden aspect-[16/10] active:scale-[0.98] transition-all ${
                isHighlighted ? "ring-2 ring-indigo-500" : ""
              }`}
            >
              {/* 배경 이미지 (풀블리드) */}
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
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 to-purple-900 flex items-center justify-center">
                  <span className="text-3xl">📸</span>
                </div>
              )}

              {/* 하단 그라데이션 + 텍스트 오버레이 */}
              <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/85 via-black/45 to-transparent">
                <h2 className="font-bold text-lg text-white drop-shadow-sm">
                  {m.name}
                </h2>
                <p className="text-gray-200 text-sm mt-0.5 drop-shadow-sm">
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
