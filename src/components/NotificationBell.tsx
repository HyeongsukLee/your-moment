"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

type Noti = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  eventId: string | null;
  read: boolean;
  createdAt: string;
};

const ICON: Record<string, string> = {
  PHOTOS_OF_ME: "✨",
  PHOTOS_UPLOADED: "📷",
  NEW_EVENT: "📅",
  ROLE_CHANGED: "🎖",
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "방금";
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

export default function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Noti[]>([]);
  const [unread, setUnread] = useState(0);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = await res.json();
      setItems(data.items ?? []);
      setUnread(data.unread ?? 0);
    } catch {
      /* noop */
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function openSheet() {
    setOpen(true);
    if (unread > 0) {
      setUnread(0);
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
      await fetch("/api/notifications/read", { method: "POST" }).catch(() => {});
    }
  }

  function onItemClick(n: Noti) {
    setOpen(false);
    if (n.eventId) router.push(`/events/${n.eventId}`);
  }

  return (
    <>
      <button
        onClick={openSheet}
        className="relative w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center active:scale-95 transition-transform"
        aria-label="알림"
      >
        <span className="text-lg">🔔</span>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center sm:justify-center"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md bg-gray-900 rounded-t-3xl sm:rounded-3xl max-h-[75vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
              <h2 className="font-semibold">알림</h2>
              <button
                onClick={() => setOpen(false)}
                className="text-gray-400 text-sm"
              >
                닫기
              </button>
            </div>

            <div className="overflow-y-auto">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-2 text-gray-500">
                  <span className="text-3xl">🔔</span>
                  <p className="text-sm">아직 알림이 없어요</p>
                </div>
              ) : (
                <ul className="divide-y divide-gray-800">
                  {items.map((n) => (
                    <li key={n.id}>
                      <button
                        onClick={() => onItemClick(n)}
                        className="w-full flex items-start gap-3 px-5 py-3.5 text-left active:bg-gray-800/50"
                      >
                        <span className="text-xl shrink-0 mt-0.5">
                          {ICON[n.type] ?? "🔔"}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-gray-100 leading-snug">
                            {n.title}
                          </p>
                          {n.body && (
                            <p className="text-xs text-gray-400 mt-0.5 truncate">
                              {n.body}
                            </p>
                          )}
                          <p className="text-[11px] text-gray-600 mt-1">
                            {timeAgo(n.createdAt)}
                            {n.eventId && " · 행사 보기 →"}
                          </p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
