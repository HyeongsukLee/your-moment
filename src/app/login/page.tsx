"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

const kakaoEnabled = process.env.NEXT_PUBLIC_KAKAO_ENABLED === "true";
const googleEnabled = process.env.NEXT_PUBLIC_GOOGLE_ENABLED === "true";
const simpleLoginEnabled =
  process.env.NODE_ENV !== "production" ||
  process.env.NEXT_PUBLIC_ENABLE_SIMPLE_LOGIN === "true";

const socialEnabled = kakaoEnabled || googleEnabled;

// 간편 로그인용 테스트 계정 (DB에 시드되어 있어야 함)
const TEST_ACCOUNTS = [
  { email: "dev@yourmoment.local", label: "운영 테스터", role: "관리자" },
  { email: "photographer1@yourmoment.local", label: "김작가", role: "작가" },
  { email: "photographer2@yourmoment.local", label: "이작가", role: "작가" },
  { email: "photographer3@yourmoment.local", label: "박작가", role: "작가" },
  { email: "participant1@yourmoment.local", label: "최참가", role: "참가자" },
  { email: "participant2@yourmoment.local", label: "정참가", role: "참가자" },
  { email: "participant3@yourmoment.local", label: "한참가", role: "참가자" },
];

const roleColor: Record<string, string> = {
  관리자: "bg-red-900/60 text-red-300",
  작가: "bg-indigo-900/60 text-indigo-300",
  참가자: "bg-gray-800 text-gray-400",
};

export default function LoginPage() {
  const [showPicker, setShowPicker] = useState(false);

  // next-auth signIn()이 credentials의 email을 authorize까지 전달하지 못하는
  // 이슈가 있어, credentials 콜백에 직접 POST 한다.
  async function devLogin(email: string) {
    const { csrfToken } = await (await fetch("/api/auth/csrf")).json();
    await fetch("/api/auth/callback/dev", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        email,
        csrfToken,
        callbackUrl: "/",
        json: "true",
      }),
    });
    window.location.href = "/";
  }

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
              <path d="M10 2C5.582 2 2 4.805 2 8.25c0 2.176 1.43 4.088 3.587 5.22L4.8 16.5l3.74-2.45c.47.065.95.1 1.46.1 4.418 0 8-2.805 8-6.25S14.418 2 10 2z" fill="#000" />
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

        {simpleLoginEnabled && !showPicker && (
          <button
            onClick={() => setShowPicker(true)}
            className={`w-full font-semibold py-4 rounded-2xl text-base active:scale-95 transition-transform ${
              socialEnabled
                ? "border border-gray-700 text-gray-300"
                : "bg-indigo-600 text-white"
            }`}
          >
            테스트 계정으로 로그인
          </button>
        )}

        {/* 테스트 계정 선택 목록 */}
        {simpleLoginEnabled && showPicker && (
          <div className="w-full bg-gray-900 rounded-2xl p-2 flex flex-col gap-1">
            <p className="text-xs text-gray-500 px-2 py-1.5">
              어떤 계정으로 로그인할까요?
            </p>
            {TEST_ACCOUNTS.map((acc) => (
              <button
                key={acc.email}
                onClick={() => devLogin(acc.email)}
                className="flex items-center justify-between px-3 py-2.5 rounded-xl active:bg-gray-800"
              >
                <span className="text-sm font-medium">{acc.label}</span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full ${roleColor[acc.role]}`}
                >
                  {acc.role}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
