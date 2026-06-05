"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import PhotoModal from "@/components/PhotoModal";

type Photo = { id: string; thumbnailUrl: string };
type EventInfo = { id: string; name: string; date: string; photoCount: number };

export default function EventGalleryPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const router = useRouter();
  const [event, setEvent] = useState<EventInfo | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<Photo | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`/api/events/${eventId}/photos`)
      .then((r) => r.json())
      .then((data) => {
        setEvent(data.event ?? null);
        setPhotos(data.photos ?? []);
        setLoading(false);
      });
  }, [eventId]);

  async function handleSelfie(file: File) {
    setSearching(true);
    const formData = new FormData();
    formData.append("selfie", file);
    formData.append("eventId", eventId);

    const res = await fetch("/api/search", { method: "POST", body: formData });
    const data = await res.json();
    setSearching(false);

    router.push(`/events/${eventId}/search?searchId=${data.searchId}`);
  }

  return (
    <div className="max-w-md mx-auto h-[100dvh] flex flex-col">
      {/* 행사 정보 헤더 */}
      <div className="shrink-0 px-4 py-4 flex items-center gap-3 border-b border-gray-900">
        <button onClick={() => router.push("/")} className="text-gray-400">
          ←
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold text-lg truncate">
            {event?.name ?? "전체 사진"}
          </h1>
          {event && (
            <p className="text-gray-400 text-xs mt-0.5">
              {new Date(event.date).toLocaleDateString("ko-KR", {
                year: "numeric",
                month: "long",
                day: "numeric",
                weekday: "short",
              })}{" "}
              · 총 {event.photoCount.toLocaleString()}장
            </p>
          )}
        </div>
      </div>

      {/* 스크롤되는 전체 사진 그리드 */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64 text-gray-500">
            불러오는 중...
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-0.5 p-0.5">
            {photos.map((photo) => (
              <button
                key={photo.id}
                onClick={() => setSelected(photo)}
                className="aspect-square relative bg-gray-900 active:opacity-80"
              >
                <Image
                  src={photo.thumbnailUrl}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="33vw"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 하단 고정 '내 사진 찾기' */}
      <div className="shrink-0 p-4 border-t border-gray-900 bg-gray-950">
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={searching}
          className="w-full bg-indigo-600 active:bg-indigo-700 text-white font-semibold py-4 rounded-2xl text-base disabled:opacity-60 transition-colors shadow-lg shadow-indigo-900/40"
        >
          {searching ? "분석 중..." : "📷 내 사진 찾기"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="user"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleSelfie(file);
          }}
        />
      </div>

      {/* 사진 다운로드 모달 */}
      {selected && (
        <PhotoModal photo={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
