"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import PhotoModal from "@/components/PhotoModal";
import RunningCat from "@/components/RunningCat";

type Photo = { id: string; thumbnailUrl: string };
type EventInfo = { id: string; name: string; date: string; photoCount: number };
type PrevSearch = { searchId: string; resultCount: number; photoIds: string[] };

export default function EventGalleryPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const router = useRouter();
  const [event, setEvent] = useState<EventInfo | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<Photo | null>(null);
  const [prevSearch, setPrevSearch] = useState<PrevSearch | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // 전체 사진 로드
    fetch(`/api/events/${eventId}/photos`)
      .then((r) => r.json())
      .then((data) => {
        setEvent(data.event ?? null);
        setPhotos(data.photos ?? []);
        setLoading(false);
      });

    // 이전 검색 결과 조회 (있으면 배너 + 강조 표시)
    fetch(`/api/search/latest?eventId=${eventId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data && data.searchId) setPrevSearch(data);
      })
      .catch(() => {});
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

  // 이전 검색에서 매칭된 photoId 집합
  const myPhotoIds = new Set(prevSearch?.photoIds ?? []);

  return (
    <div className="max-w-md mx-auto h-[100dvh] flex flex-col">
      {/* 헤더 */}
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

      {/* 스크롤 영역 */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64 text-gray-500">
            불러오는 중...
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-0.5 p-0.5">
            {photos.map((photo) => {
              const isMine = myPhotoIds.has(photo.id);
              return (
                <button
                  key={photo.id}
                  onClick={() => setSelected(photo)}
                  className={`aspect-square relative bg-gray-900 active:opacity-80 ${
                    isMine ? "ring-2 ring-indigo-500 ring-inset" : ""
                  }`}
                >
                  <Image
                    src={photo.thumbnailUrl}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="33vw"
                  />
                  {/* 내 사진 뱃지 */}
                  {isMine && (
                    <span className="absolute top-1 right-1 text-[10px] bg-indigo-600 text-white rounded-full w-5 h-5 flex items-center justify-center leading-none">
                      ✦
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 하단 버튼 영역 */}
      <div className="shrink-0 border-t border-gray-900 bg-gray-950">
        {/* 이전 검색 배너 */}
        {prevSearch && (
          <button
            onClick={() =>
              router.push(
                `/events/${eventId}/search?searchId=${prevSearch.searchId}`
              )
            }
            className="w-full flex items-center justify-between px-4 py-3 border-b border-gray-900 active:bg-gray-900/50"
          >
            <div className="flex items-center gap-2">
              <span className="text-indigo-400 text-sm">✦</span>
              <span className="text-sm text-indigo-300">
                이전에 찾은 내 사진{" "}
                <span className="font-semibold">{prevSearch.resultCount}장</span>
              </span>
            </div>
            <span className="text-xs text-indigo-400 font-medium">
              바로 보기 →
            </span>
          </button>
        )}

        {/* 내 사진 찾기 버튼 */}
        <div className="p-4">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={searching}
            className="w-full bg-indigo-600 active:bg-indigo-700 text-white font-semibold py-4 rounded-2xl text-base disabled:opacity-60 transition-colors shadow-lg shadow-indigo-900/40"
          >
            {searching ? "분석 중..." : prevSearch ? "📷 다시 찾기" : "📷 내 사진 찾기"}
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
      </div>

      {/* 사진 다운로드 모달 */}
      {selected && (
        <PhotoModal photo={selected} onClose={() => setSelected(null)} />
      )}

      {/* 사진찾기 로딩 오버레이 (달리는 고양이) */}
      {searching && (
        <div className="fixed inset-0 z-50 bg-gray-950/95 backdrop-blur-sm flex flex-col items-center justify-center gap-6 px-8">
          <RunningCat />
          <div className="text-center">
            <p className="text-lg font-semibold">사진을 찾고 있습니다</p>
            <p className="text-gray-400 text-sm mt-1">
              얼굴을 분석하는 중이에요 · 잠시만요
            </p>
          </div>
          <div className="w-40 h-1.5 rounded-full bg-gray-800 overflow-hidden">
            <div className="h-full w-1/2 bg-indigo-500 rounded-full animate-pulse" />
          </div>
        </div>
      )}
    </div>
  );
}
