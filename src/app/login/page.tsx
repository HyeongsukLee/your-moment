"use client";

import { signIn } from "next-auth/react";

const kakaoEnabled = process.env.NEXT_PUBLIC_KAKAO_ENABLED === "true";
const simpleLoginEnabled =
  process.env.NODE_ENV !== "production" ||
  process.env.NEXT_PUBLIC_ENABLE_SIMPLE_LOGIN === "true";

export default function LoginPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold mb-2">유어모먼트</h1>
        <p className="text-gray-400">오늘의 순간에서 나를 찾아보세요</p>
      </div>

      {kakaoEnabled && (
        <button
          onClick={() => signIn("kakao", { callbackUrl: "/" })}
          className="w-full max-w-xs bg-[#FEE500] text-black font-semibold py-4 rounded-2xl flex items-center justify-center gap-3 text-base active:scale-95 transition-transform"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M10 2C5.582 2 2 4.805 2 8.25c0 2.176 1.43 4.088 3.587 5.22L4.8 16.5l3.74-2.45c.47.065.95.1 1.46.1 4.418 0 8-2.805 8-6.25S14.418 2 10 2z"
              fill="#000"
            />
          </svg>
          카카오로 시작하기
        </button>
      )}

      {simpleLoginEnabled && (
        <button
          onClick={() => signIn("dev", { callbackUrl: "/" })}
          className={`w-full max-w-xs font-semibold py-4 rounded-2xl text-base active:scale-95 transition-transform ${
            kakaoEnabled
              ? "mt-4 border border-gray-700 text-gray-300"
              : "bg-indigo-600 text-white"
          }`}
        >
          간편 로그인으로 시작하기
        </button>
      )}
    </div>
  );
}
