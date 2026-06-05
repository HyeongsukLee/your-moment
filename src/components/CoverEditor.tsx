"use client";

import { useRef, useState } from "react";

type Props = {
  eventId: string;
  photo: { id: string; thumbnailUrl: string };
  initialPosition: string | null; // "x% y%"
  onClose: () => void;
  onSaved: (photoId: string, position: string) => void;
};

function parsePos(p: string | null): { x: number; y: number } {
  const m = p?.match(/^(\d{1,3})% (\d{1,3})%$/);
  return m ? { x: +m[1], y: +m[2] } : { x: 50, y: 50 };
}

const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)));

export default function CoverEditor({
  eventId,
  photo,
  initialPosition,
  onClose,
  onSaved,
}: Props) {
  const [pos, setPos] = useState(parsePos(initialPosition));
  const [saving, setSaving] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);

  function onPointerDown(e: React.PointerEvent) {
    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // 일부 환경/합성 이벤트에서 미지원 — 캡처 없이도 드래그 동작
    }
    drag.current = { x: e.clientX, y: e.clientY, px: pos.x, py: pos.y };
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current || !frameRef.current) return;
    const rect = frameRef.current.getBoundingClientRect();
    const dx = e.clientX - drag.current.x;
    const dy = e.clientY - drag.current.y;
    // 이미지를 끌면(오른쪽) 왼쪽 영역이 보이도록 position은 반대로 이동
    setPos({
      x: clamp(drag.current.px - (dx / rect.width) * 100),
      y: clamp(drag.current.py - (dy / rect.height) * 100),
    });
  }

  function onPointerUp() {
    drag.current = null;
  }

  async function save() {
    setSaving(true);
    const position = `${pos.x}% ${pos.y}%`;
    await fetch("/api/admin/set-cover", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId, photoId: photo.id, position }),
    });
    setSaving(false);
    onSaved(photo.id, position);
  }

  const objectPosition = `${pos.x}% ${pos.y}%`;

  return (
    <div className="fixed inset-0 z-30 bg-black/70 flex items-end sm:items-center justify-center">
      <div className="w-full max-w-md bg-gray-900 rounded-t-3xl sm:rounded-3xl p-5">
        <h3 className="font-semibold mb-1">대표 사진 위치 조정</h3>
        <p className="text-xs text-gray-400 mb-4">
          이미지를 드래그해서 카드에 보일 부분을 정하세요
        </p>

        {/* 홈 카드와 동일한 비율(h-32)의 미리보기 프레임 */}
        <div
          ref={frameRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          className="relative h-32 w-full rounded-2xl overflow-hidden bg-gray-800 cursor-grab active:cursor-grabbing touch-none select-none"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo.thumbnailUrl}
            alt=""
            draggable={false}
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            style={{ objectPosition }}
          />
          <div className="absolute inset-0 ring-1 ring-white/10 rounded-2xl pointer-events-none" />
        </div>

        <div className="flex gap-2 mt-5">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-gray-800 text-gray-300 text-sm font-medium"
          >
            취소
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="flex-1 py-3 rounded-xl bg-indigo-600 active:bg-indigo-700 text-white text-sm font-medium disabled:opacity-60"
          >
            {saving ? "저장 중..." : "대표 사진으로 저장"}
          </button>
        </div>
      </div>
    </div>
  );
}
