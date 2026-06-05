"use client";

import { useEffect } from "react";

export type ToastData = {
  message: string;
  sub?: string;
  showGallery?: boolean; // iOS 사진 앱 열기 버튼 노출 여부
};

type Props = {
  toast: ToastData | null;
  onClose: () => void;
};

export default function Toast({ toast, onClose }: Props) {
  // 4초 후 자동 닫기
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [toast, onClose]);

  if (!toast) return null;

  return (
    <div className="fixed bottom-24 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
      <div className="pointer-events-auto max-w-sm w-full bg-gray-800 border border-gray-700 rounded-2xl px-4 py-3 shadow-2xl flex items-start gap-3 animate-[slideUp_0.25s_ease-out]">
        <span className="text-green-400 text-xl mt-0.5">✓</span>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white">{toast.message}</p>
          {toast.sub && (
            <p className="text-xs text-gray-400 mt-0.5">{toast.sub}</p>
          )}
          {toast.showGallery && (
            /* <a href> 태그 사용 — Chrome iOS에서 window.location 방식은 차단됨.
               iOS는 href 클릭을 OS 레벨에서 처리해 Photos 앱을 직접 열어줌. */
            <a
              href="photos-library://"
              className="mt-2 inline-block text-xs text-indigo-300 font-medium underline underline-offset-2"
            >
              📷 사진 앱에서 확인하기
            </a>
          )}
        </div>

        <button
          onClick={onClose}
          className="text-gray-500 active:text-gray-300 shrink-0"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 2L12 12M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
