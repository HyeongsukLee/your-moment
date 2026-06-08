"use client";

import { useState } from "react";

type Props = {
  photo: {
    id: string;
    thumbnailUrl: string;
    uploaderName?: string | null;
    uploaderInstagram?: string | null;
  };
  onClose: () => void;
};

export default function PhotoModal({ photo, onClose }: Props) {
  const [downloading, setDownloading] = useState(false);

  async function download() {
    setDownloading(true);
    try {
      const res = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoIds: [photo.id] }),
      });
      const { urls } = await res.json();
      const url = urls?.[0]?.url;
      if (url) {
        const a = document.createElement("a");
        a.href = url;
        a.download = "";
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-40 bg-black/90 flex flex-col"
      onClick={onClose}
    >
      {/* 얇은 선 X 닫기 버튼 */}
      <div className="flex justify-end p-4">
        <button
          onClick={onClose}
          aria-label="닫기"
          className="w-9 h-9 rounded-full border border-white/40 flex items-center justify-center text-white/90 active:bg-white/10"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M3 3L13 13M13 3L3 13"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      {/* 이미지 */}
      <div
        className="flex-1 flex items-center justify-center px-4 min-h-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.thumbnailUrl}
          alt=""
          className="max-w-full max-h-full object-contain rounded-lg"
        />
      </div>

      {/* 촬영 작가 크레딧 */}
      {(photo.uploaderName || photo.uploaderInstagram) && (
        <div
          className="px-6 pt-4 flex items-center justify-center gap-2 text-sm"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="text-white/60">촬영</span>
          {photo.uploaderName && (
            <span className="text-white/90 font-medium">
              {photo.uploaderName}
            </span>
          )}
          {photo.uploaderInstagram && (
            <a
              href={`https://instagram.com/${photo.uploaderInstagram}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-indigo-300 active:text-indigo-200"
            >
              @{photo.uploaderInstagram}
            </a>
          )}
        </div>
      )}

      {/* 다운로드 버튼 */}
      <div className="p-6 flex justify-center" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={download}
          disabled={downloading}
          className="w-full max-w-md border border-white/40 text-white font-medium py-3.5 rounded-2xl text-sm active:bg-white/10 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M8 2V10M8 10L5 7M8 10L11 7M3 13H13"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {downloading ? "다운로드 중..." : "고화질 원본 다운로드"}
        </button>
      </div>
    </div>
  );
}
