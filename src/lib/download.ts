/**
 * 이미지 URL을 받아 기기에 저장합니다.
 * - iOS (Web Share API 지원): 공유시트를 열어 "사진에 저장" 가능
 * - 그 외: blob URL을 통한 파일 다운로드
 */
export async function saveImage(url: string, filename = "your-moment.jpg") {
  const res = await fetch(url);
  const blob = await res.blob();
  const file = new File([blob], filename, { type: blob.type || "image/jpeg" });

  if (canNativeShare([file])) {
    await navigator.share({ files: [file], title: "your moment" });
    return;
  }

  fallbackDownload(file);
}

/**
 * 여러 presigned URL을 한 번의 Web Share 호출로 저장합니다.
 * iOS는 share()를 호출당 1번만 user-gesture로 인정하므로
 * 파일을 모두 fetch한 뒤 한꺼번에 share() 합니다.
 */
export async function saveImages(
  entries: { url: string; id: string }[],
  onProgress?: (done: number, total: number) => void
) {
  if (entries.length === 0) return;

  // 1) 모든 blob 다운로드
  const files: File[] = [];
  for (let i = 0; i < entries.length; i++) {
    const res = await fetch(entries[i].url);
    const blob = await res.blob();
    files.push(
      new File([blob], `your-moment-${entries[i].id}.jpg`, {
        type: blob.type || "image/jpeg",
      })
    );
    onProgress?.(i + 1, entries.length);
  }

  // 2a) iOS: 한 번에 전체 공유
  if (canNativeShare(files)) {
    await navigator.share({ files, title: "your moment" });
    return;
  }

  // 2b) Fallback (Android/Desktop): 순차 다운로드
  for (const file of files) {
    fallbackDownload(file);
    await new Promise((r) => setTimeout(r, 400));
  }
}

// ── 내부 유틸 ───────────────────────────────────────

function canNativeShare(files: File[]): boolean {
  if (typeof navigator === "undefined") return false;
  // iPad는 Web Share 공유시트에 "사진에 저장"이 없으므로 제외 — iPhone만 허용
  const isIphone = /iPhone/.test(navigator.userAgent);
  if (!isIphone) return false;
  return (
    typeof navigator.share === "function" &&
    typeof navigator.canShare === "function" &&
    navigator.canShare({ files })
  );
}

function fallbackDownload(file: File) {
  const objUrl = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = objUrl;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(objUrl), 2000);
}
