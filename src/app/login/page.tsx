"use client";

import { signIn } from "next-auth/react";

const kakaoEnabled = process.env.NEXT_PUBLIC_KAKAO_ENABLED === "true";
const googleEnabled = process.env.NEXT_PUBLIC_GOOGLE_ENABLED === "true";
const simpleLoginEnabled =
  process.env.NODE_ENV !== "production" ||
  process.env.NEXT_PUBLIC_ENABLE_SIMPLE_LOGIN === "true";

const socialEnabled = kakaoEnabled || googleEnabled;

export default function LoginPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold mb-2">your moment</h1>
        <p className="text-gray-400">오늘의 순간에서 나를 찾아보세요</p>
      </div>

      <div className="w-full max-w-xs flex flex-col gap-3">
        {kakaoEnabled && (
          <button
            onClick={() => signIn("kakao", { callbackUrl: "/" })}
            className="w-full bg-[#FEE500] text-black font-semibold py-4 rounded-2xl flex items-center justify-center gap-3 text-base active:scale-95 transition-transform"
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

        {googleEnabled && (
          <button
            onClick={() => signIn("google", { callbackUrl: "/" })}
            className="w-full bg-white text-gray-800 font-semibold py-4 rounded-2xl flex items-center justify-center gap-3 text-base active:scale-95 transition-transform"
          >
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M17.6 9.2c0-.6-.05-1.18-.16-1.74H9v3.3h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.54z" />
              <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.93v2.33A9 9 0 0 0 9 18z" />
              <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.93a9 9 0 0 0 0 8.1l3.04-2.33z" />
              <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 .93 4.95l3.04 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
            </svg>
            구글로 시작하기
          </button>
        )}

        {simpleLoginEnabled && (
          <button
            onClick={() => signIn("dev", { callbackUrl: "/" })}
            className={`w-full font-semibold py-4 rounded-2xl text-base active:scale-95 transition-transform ${
              socialEnabled
                ? "border border-gray-700 text-gray-300"
                : "bg-indigo-600 text-white"
            }`}
          >
            간편 로그인으로 시작하기
          </button>
        )}
      </div>
    </div>
  );
}
