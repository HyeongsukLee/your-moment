"use client";

import { useEffect, useState } from "react";

export type ToastData = {
  message: string;
  sub?: string;
  showGallery?: boolean;
};

type Props = {
  toast: ToastData | null;
  onClose: () => void;
};

type Platform = "ios-safari" | "ios-chrome" | "android" | "desktop";

function getPlatform(): Platform {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent;
  const isIOS = /iP(hone|ad|od)/i.test(ua);
  const isAndroid = /Android/i.test(ua);
  const isSafari = /Safari/i.test(ua) && !/CriOS|FxiOS|OPiOS|EdgiOS/i.test(ua);
  if (isIOS && isSafari) return "ios-safari";
  if (isIOS) return "ios-chrome";
  if (isAndroid) return "android";
  return "desktop";
}

export default function Toast({ toast, onClose }: Props) {
  const [platform, setPlatform] = useState<Platform>("desktop");

  useEffect(() => {
    setPlatform(getPlatform());
  }, []);

  // 5초 후 자동 닫기
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onClose, 5000);
    return () => clearTimeout(t);
  }, [toast, onClose]);

  if (!toast) return null;

  return (
    <div className="fixed bottom-24 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
      <div className="pointer-events-auto max-w-sm w-full bg-gray-800 border border-gray-700 rounded-2xl px-4 py-3 shadow-2xl flex items-start gap-3 animate-[slideUp_0.25s_ease-out]">
        <span className="text-green-400 text-xl mt-0.5">✓</span>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white">{toast.message}</p>

          {toast.showGallery && (
            <div className="mt-1.5">
              {platform === "ios-safari" ? (
                // iOS Safari: photos-library:// 딥링크 작동
                <a
                  href="photos-library://"
                  className="text-xs text-indigo-300 font-medium underline underline-offset-2"
                >
                  📷 사진 앱에서 확인하기
                </a>
              ) : platform === "android" ? (
                // Android: 갤러리 앱 딥링크 없음 — 갤러리/다운로드 안내
                <p className="text-xs text-gray-400">
                  📂 갤러리 또는 다운로드 앱에서 확인하세요
                </p>
              ) : platform === "ios-chrome" ? (
                // iOS Chrome: photos-library:// 차단
                <p className="text-xs text-gray-400">
                  📷 사진 앱을 열어서 확인하세요
                </p>
              ) : null}
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          className="text-gray-500 active:text-gray-300 shrink-0 mt-0.5"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 2L12 12M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
