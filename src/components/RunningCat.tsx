// 달리는 고양이 SVG (CSS 애니메이션은 globals.css의 ym-* 클래스)
export default function RunningCat() {
  return (
    <svg
      width="160"
      height="110"
      viewBox="0 0 160 110"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* 바닥에 흐르는 속도선 (달리는 느낌) */}
      <g stroke="#6366f1" strokeWidth="3" strokeLinecap="round" opacity="0.8">
        <line className="ym-speed" x1="20" y1="92" x2="44" y2="92" />
        <line className="ym-speed-2" x1="16" y1="100" x2="40" y2="100" />
        <line className="ym-speed-3" x1="24" y1="84" x2="48" y2="84" />
      </g>

      <g className="ym-cat">
        {/* 꼬리 */}
        <path
          className="ym-tail"
          d="M44 60 C24 58 16 40 14 26"
          stroke="#e5e7eb"
          strokeWidth="7"
          strokeLinecap="round"
          fill="none"
        />

        {/* 뒷다리 */}
        <rect className="ym-leg ym-leg-b" x="54" y="58" width="7" height="22" rx="3.5" fill="#cbd5e1" />
        <rect className="ym-leg ym-leg-b" x="64" y="58" width="7" height="22" rx="3.5" fill="#e5e7eb" />
        {/* 앞다리 */}
        <rect className="ym-leg ym-leg-a" x="92" y="58" width="7" height="22" rx="3.5" fill="#cbd5e1" />
        <rect className="ym-leg ym-leg-a" x="102" y="58" width="7" height="22" rx="3.5" fill="#e5e7eb" />

        {/* 몸통 */}
        <ellipse cx="78" cy="52" rx="40" ry="20" fill="#f3f4f6" />

        {/* 머리 */}
        <circle cx="120" cy="42" r="17" fill="#f9fafb" />
        {/* 귀 */}
        <path d="M108 30 L110 16 L120 26 Z" fill="#f9fafb" />
        <path d="M132 30 L134 14 L122 25 Z" fill="#f9fafb" />
        <path d="M110 27 L111 19 L116 25 Z" fill="#fca5a5" />
        <path d="M130 27 L131 18 L125 24 Z" fill="#fca5a5" />
        {/* 눈 */}
        <circle cx="126" cy="40" r="2.5" fill="#1f2937" />
        {/* 코 */}
        <circle cx="135" cy="45" r="2" fill="#f472b6" />
        {/* 수염 */}
        <g stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round">
          <line x1="134" y1="48" x2="150" y2="46" />
          <line x1="134" y1="50" x2="150" y2="52" />
        </g>
      </g>
    </svg>
  );
}
