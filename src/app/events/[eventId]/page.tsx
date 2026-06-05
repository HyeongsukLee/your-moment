"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import PhotoModal from "@/components/PhotoModal";
import RunningCat from "@/components/RunningCat";
import Toast, { type ToastData } from "@/components/Toast";
import { saveImages } from "@/lib/download";

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
  const [prevSearch, setPrevSearch] = useState<PrevSearch | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 사진 확대 모달
  const [viewPhoto, setViewPhoto] = useState<Photo | null>(null);

  // 선택 모드
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // 다운로드 + 토스트
  const [downloading, setDownloading] = useState(false);
  const [dlProgress, setDlProgress] = useState({ done: 0, total: 0 });
  const [toast, setToast] = useState<ToastData | null>(null);
  const closeToast = useCallback(() => setToast(null), []);

  useEffect(() => {
    fetch(`/api/events/${eventId}/photos`)
      .then((r) => r.json())
      .then((data) => {
        setEvent(data.event ?? null);
        setPhotos(data.photos ?? []);
        setLoading(false);
      });

    fetch(`/api/search/latest?eventId=${eventId}`)
      .then((r) => r.json())
      .then((data) => { if (data?.searchId) setPrevSearch(data); })
      .catch(() => {});
  }, [eventId]);

  // ── 선택 모드 ───────────────────────────────────
  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selectedIds.size === photos.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(photos.map((p) => p.id)));
  }

  function cancelSelect() {
    setSelectMode(false);
    setSelectedIds(new Set());
  }

  // ── 다운로드 ────────────────────────────────────
  async function downloadPhotos(ids: string[]) {
    if (ids.length === 0) return;
    setDownloading(true);
    setDlProgress({ done: 0, total: ids.length });
    try {
      const res = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoIds: ids }),
      });
      const { urls } = await res.json();
      await saveImages(urls, (done, total) => setDlProgress({ done, total }));
      cancelSelect();
      setToast({
        message: `${ids.length}장 저장 완료`,
        showGallery: true,
      });
    } finally {
      setDownloading(false);
    }
  }

  // ── 셀카 검색 ───────────────────────────────────
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

  const myPhotoIds = new Set(prevSearch?.photoIds ?? []);
  const allSelected = selectedIds.size === photos.length && photos.length > 0;

  return (
    <div className="max-w-md mx-auto h-[100dvh] flex flex-col">

      {/* ── 헤더 ─────────────────────────────────── */}
      <div className="shrink-0 px-4 py-4 flex items-center gap-2 border-b border-gray-900">
        {selectMode ? (
          /* 선택 모드 헤더 */
          <>
            <button onClick={cancelSelect} className="text-gray-400 text-sm">
              취소
            </button>
            <span className="flex-1 font-semibold text-sm text-center">
              {selectedIds.size > 0 ? `${selectedIds.size}장 선택됨` : "사진 선택"}
            </span>
            <button
              onClick={toggleAll}
              className="text-indigo-400 text-sm font-medium"
            >
              {allSelected ? "전체 해제" : "전체 선택"}
            </button>
          </>
        ) : (
          /* 일반 헤더 */
          <>
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
                    year: "numeric", month: "long", day: "numeric", weekday: "short",
                  })}{" "}· 총 {event.photoCount.toLocaleString()}장
                </p>
              )}
            </div>
            {photos.length > 0 && (
              <button
                onClick={() => setSelectMode(true)}
                className="text-indigo-400 text-sm font-medium px-3 py-1.5 rounded-xl bg-indigo-950/60"
              >
                선택
              </button>
            )}
          </>
        )}
      </div>

      {/* ── 사진 그리드 ──────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64 text-gray-500">
            불러오는 중...
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-0.5 p-0.5">
            {photos.map((photo) => {
              const isMine = myPhotoIds.has(photo.id);
              const isSel = selectedIds.has(photo.id);
              return (
                <button
                  key={photo.id}
                  onClick={() => {
                    if (selectMode) toggleSelect(photo.id);
                    else setViewPhoto(photo);
                  }}
                  className={`aspect-square relative bg-gray-900 active:opacity-80 ${
                    isSel
                      ? "ring-2 ring-indigo-500 ring-inset"
                      : isMine
                        ? "ring-2 ring-indigo-500/50 ring-inset"
                        : ""
                  }`}
                >
                  <Image
                    src={photo.thumbnailUrl}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="33vw"
                  />
                  {/* 선택 체크박스 */}
                  {selectMode && (
                    <div className={`absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] border ${
                      isSel
                        ? "bg-indigo-600 border-indigo-600 text-white"
                        : "bg-black/40 border-white/60"
                    }`}>
                      {isSel && "✓"}
                    </div>
                  )}
                  {/* 내 사진 뱃지 (선택 모드 아닐 때) */}
                  {!selectMode && isMine && (
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

      {/* ── 하단 영역 ────────────────────────────── */}
      <div className="shrink-0 border-t border-gray-900 bg-gray-950">
        {/* 이전 검색 배너 (선택 모드가 아닐 때만) */}
        {!selectMode && prevSearch && (
          <button
            onClick={() => router.push(`/events/${eventId}/search?searchId=${prevSearch.searchId}`)}
            className="w-full flex items-center justify-between px-4 py-3 border-b border-gray-900 active:bg-gray-900/50"
          >
            <div className="flex items-center gap-2">
              <span className="text-indigo-400 text-sm">✦</span>
              <span className="text-sm text-indigo-300">
                이전에 찾은 내 사진{" "}
                <span className="font-semibold">{prevSearch.resultCount}장</span>
              </span>
            </div>
            <span className="text-xs text-indigo-400 font-medium">바로 보기 →</span>
          </button>
        )}

        <div className="p-4">
          {selectMode ? (
            /* 선택 모드: 다운로드 버튼 */
            <button
              onClick={() => downloadPhotos([...selectedIds])}
              disabled={downloading || selectedIds.size === 0}
              className="w-full bg-indigo-600 active:bg-indigo-700 text-white font-semibold py-4 rounded-2xl text-base disabled:opacity-50 transition-colors"
            >
              {downloading
                ? `저장 중... (${dlProgress.done}/${dlProgress.total})`
                : selectedIds.size > 0
                  ? `선택한 ${selectedIds.size}장 다운로드`
                  : "사진을 선택하세요"}
            </button>
          ) : (
            /* 일반 모드: 내 사진 찾기 */
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={searching}
              className="w-full bg-indigo-600 active:bg-indigo-700 text-white font-semibold py-4 rounded-2xl text-base disabled:opacity-60 transition-colors shadow-lg shadow-indigo-900/40"
            >
              {searching ? "분석 중..." : prevSearch ? "📷 다시 찾기" : "📷 내 사진 찾기"}
            </button>
          )}
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

      {/* 사진 확대 모달 */}
      {viewPhoto && (
        <PhotoModal photo={viewPhoto} onClose={() => setViewPhoto(null)} />
      )}

      {/* 사진찾기 로딩 오버레이 */}
      {searching && (
        <div className="fixed inset-0 z-50 bg-gray-950/95 backdrop-blur-sm flex flex-col items-center justify-center gap-6 px-8">
          <RunningCat />
          <div className="text-center">
            <p className="text-lg font-semibold">사진을 찾고 있습니다</p>
            <p className="text-gray-400 text-sm mt-1">얼굴을 분석하는 중이에요 · 잠시만요</p>
          </div>
          <div className="w-40 h-1.5 rounded-full bg-gray-800 overflow-hidden">
            <div className="h-full w-1/2 bg-indigo-500 rounded-full animate-pulse" />
          </div>
        </div>
      )}

      {/* 다운로드 완료 토스트 */}
      <Toast toast={toast} onClose={closeToast} />
    </div>
  );
}
