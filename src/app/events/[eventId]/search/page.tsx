"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { saveImage, fetchBlobFile, canNativeShare, fallbackDownload } from "@/lib/download";
import Toast, { type ToastData } from "@/components/Toast";

type Photo = {
  id: string;
  thumbnailUrl: string;
  uploaderName?: string | null;
  uploaderInstagram?: string | null;
};

export default function SearchResultPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const searchId = searchParams.get("searchId");

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);

  // 확대 모달
  const [viewPhoto, setViewPhoto] = useState<Photo | null>(null);

  // 선택 모드
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // 공유 상태
  const [downloading, setDownloading] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);
  const closeToast = useCallback(() => setToast(null), []);
  const cancelledRef = useRef(false);
  const prefetchMap = useRef<Map<string, Promise<File>>>(new Map());

  useEffect(() => {
    if (!searchId) return;
    fetch(`/api/search/${searchId}`)
      .then((r) => r.json())
      .then((data) => {
        setPhotos(data.results ?? []);
        setLoading(false);
      });
  }, [searchId]);

  /* 백그라운드 선-fetch */
  function prefetchPhoto(id: string) {
    if (prefetchMap.current.has(id)) return;
    const promise = fetch("/api/download", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ photoIds: [id] }),
    })
      .then((r) => r.json())
      .then(({ urls }) => fetchBlobFile(urls[0].url, id));
    prefetchMap.current.set(id, promise);
  }

  /* 선택 토글 */
  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        prefetchPhoto(id); // 선택 즉시 백그라운드 fetch
      }
      return next;
    });
  }

  /* 선택 모드 취소 */
  function cancelSelect() {
    setSelectMode(false);
    setSelected(new Set());
  }

  /* 공유/저장 */
  async function sharePhotos(ids: string[]) {
    if (ids.length === 0) return;
    setDownloading(true);
    try {
      const files = await Promise.all(
        ids.map((id) => {
          if (!prefetchMap.current.has(id)) prefetchPhoto(id);
          return prefetchMap.current.get(id)!;
        })
      );

      setDownloading(false); // 스피너 해제 후 share

      if (canNativeShare(files)) {
        await navigator.share({ files, title: "your moment" });
      } else {
        for (const file of files) {
          fallbackDownload(file);
          await new Promise((r) => setTimeout(r, 400));
        }
      }

      ids.forEach((id) => prefetchMap.current.delete(id));
      cancelSelect();
      setToast({
        message: `${ids.length}장 저장 완료`,
        sub: "사진 앱에서 확인하세요",
        showGallery: true,
      });
    } catch (e: unknown) {
      if (e instanceof Error && (e.message === "cancelled" || e.name === "AbortError")) return;
      throw e;
    } finally {
      setDownloading(false);
    }
  }

  /* 단일 사진 다운로드 (모달에서) */
  async function downloadOne(photo: Photo) {
    setDownloading(true);
    try {
      const res = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoIds: [photo.id] }),
      });
      const { urls } = await res.json();
      if (urls?.[0]?.url) {
        await saveImage(urls[0].url, `your-moment-${photo.id}.jpg`);
        setToast({
          message: "1장 저장 완료",
          sub: "사진 앱에서 확인하세요",
          showGallery: true,
        });
        setViewPhoto(null);
      }
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto h-[100dvh] flex flex-col">
      {/* 헤더 */}
      <div className="shrink-0 px-4 py-4 flex items-center gap-2 border-b border-gray-900">
        {selectMode ? (
          <>
            <button onClick={cancelSelect} className="text-gray-400 text-sm">
              취소
            </button>
            <span className="flex-1 font-semibold text-sm text-center">
              {selected.size > 0 ? `${selected.size}장 선택됨` : "사진 선택"}
            </span>
            {/* 공유 아이콘 버튼 */}
            <button
              onClick={() => sharePhotos([...selected])}
              disabled={selected.size === 0 || downloading}
              className="w-9 h-9 flex items-center justify-center rounded-full active:bg-white/10 disabled:opacity-30 transition-opacity"
              aria-label="공유 및 저장"
            >
              {downloading ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="animate-spin">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeOpacity="0.3"/>
                  <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M8.59 13.51L15.42 17.49M15.41 6.51L8.59 10.49M21 5C21 6.65685 19.6569 8 18 8C16.3431 8 15 6.65685 15 5C15 3.34315 16.3431 2 18 2C19.6569 2 21 3.34315 21 5ZM9 12C9 13.6569 7.65685 15 6 15C4.34315 15 3 13.6569 3 12C3 10.3431 4.34315 9 6 9C7.65685 9 9 10.3431 9 12ZM21 19C21 20.6569 19.6569 22 18 22C16.3431 22 15 20.6569 15 19C15 17.3431 16.3431 16 18 16C19.6569 16 21 17.3431 21 19Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              )}
            </button>
          </>
        ) : (
          <>
            <button onClick={() => router.back()} className="text-gray-400 mr-1">
              ←
            </button>
            <h1 className="font-semibold text-base flex-1">
              내 사진 {photos.length}장
            </h1>
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

      {/* 사진 그리드 (스크롤 영역) */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64 text-gray-500">
            불러오는 중...
          </div>
        ) : photos.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-500">
            <span className="text-4xl">🔍</span>
            <p>찾은 사진이 없어요</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-0.5 p-0.5">
            {photos.map((photo) => {
              const isSel = selected.has(photo.id);
              return (
                <button
                  key={photo.id}
                  onClick={() => {
                    if (selectMode) toggle(photo.id);
                    else setViewPhoto(photo);
                  }}
                  className={`aspect-square relative bg-gray-900 active:opacity-80 ${
                    selectMode && isSel ? "ring-2 ring-indigo-500 ring-inset" : ""
                  }`}
                >
                  <Image
                    src={photo.thumbnailUrl}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="50vw"
                  />
                  {selectMode && (
                    <div
                      className={`absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs border-2 ${
                        isSel
                          ? "bg-indigo-600 border-indigo-600 text-white"
                          : "bg-black/40 border-white/60"
                      }`}
                    >
                      {isSel && "✓"}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 하단: 일반 모드에서만 전체 저장 버튼 (선택 모드는 헤더 공유 아이콘 사용) */}
      {!selectMode && photos.length > 0 && (
        <div className="shrink-0 p-4 border-t border-gray-900 bg-gray-950">
          <button
            onClick={() => sharePhotos(photos.map((p) => p.id))}
            disabled={downloading}
            className="w-full bg-indigo-600 active:bg-indigo-700 text-white font-semibold py-4 rounded-2xl text-base disabled:opacity-50 transition-colors shadow-lg shadow-indigo-900/40"
          >
            전체 {photos.length}장 저장
          </button>
        </div>
      )}

      {/* 사진 확대 모달 */}
      {viewPhoto && (
        <div className="fixed inset-0 z-40 bg-black flex flex-col">
          {/* 상단: 닫기 + 다운로드 */}
          <div className="flex items-center justify-between px-4 pt-safe pt-4 pb-2">
            <button
              onClick={() => setViewPhoto(null)}
              aria-label="닫기"
              className="w-9 h-9 rounded-full border border-white/30 flex items-center justify-center text-white/80 active:bg-white/10"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 2L12 12M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>

            {/* 다운로드 버튼: 상단 우측 (닫기 옆) */}
            <button
              onClick={() => downloadOne(viewPhoto)}
              disabled={downloading}
              className="flex items-center gap-1.5 border border-white/30 text-white/80 text-sm px-4 py-2 rounded-full active:bg-white/10 disabled:opacity-50"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 1v8M7 9L4.5 6.5M7 9L9.5 6.5M2 12h10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {downloading ? "저장 중" : "저장"}
            </button>
          </div>

          {/* 이미지 (세로 스크롤 없이 꽉 채워 보기) */}
          <div className="flex-1 flex items-center justify-center px-2 min-h-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={viewPhoto.thumbnailUrl}
              alt=""
              className="max-w-full max-h-full object-contain rounded-lg"
              style={{ touchAction: "pinch-zoom" }}
            />
          </div>

          {/* 촬영 작가 크레딧 */}
          {(viewPhoto.uploaderName || viewPhoto.uploaderInstagram) && (
            <div className="flex items-center justify-center gap-2 text-sm py-3">
              <span className="text-white/60">촬영</span>
              {viewPhoto.uploaderName && (
                <span className="text-white/90 font-medium">
                  {viewPhoto.uploaderName}
                </span>
              )}
              {viewPhoto.uploaderInstagram && (
                <a
                  href={`https://instagram.com/${viewPhoto.uploaderInstagram}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-300 active:text-indigo-200"
                >
                  @{viewPhoto.uploaderInstagram}
                </a>
              )}
            </div>
          )}

          {/* 여백 */}
          <div className="h-4" />
        </div>
      )}


      {/* 다운로드 완료 토스트 */}
      <Toast toast={toast} onClose={closeToast} />
    </div>
  );
}
