import { zipSync } from "fflate";

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

  // 2b) Fallback (Desktop): 2장 이상은 ZIP, 1장은 개별 다운로드
  if (files.length > 1) {
    await zipAndDownload(files);
  } else {
    fallbackDownload(files[0]);
  }
}

/**
 * 단일 presigned URL을 fetch해 File 객체로 반환합니다.
 * 선택 시 백그라운드 pre-fetch용으로 사용합니다.
 */
export async function fetchBlobFile(url: string, id: string): Promise<File> {
  const res = await fetch(url);
  const blob = await res.blob();
  return new File([blob], `your-moment-${id}.jpg`, {
    type: blob.type || "image/jpeg",
  });
}

// ── 내부 유틸 ───────────────────────────────────────

export function canNativeShare(files: File[]): boolean {
  if (typeof navigator === "undefined") return false;
  // 터치 없는 데스크탑(Mac, Windows 등)은 공유시트에 "사진에 저장"이 없으므로 제외
  if (navigator.maxTouchPoints === 0) return false;
  const ua = navigator.userAgent;
  const isIphone = /iPhone/.test(ua);
  // iPad Safari (Chrome 제외): Web Share → "사진에 저장" 지원
  const isIpadSafari = /iPad/.test(ua) && !/CriOS|Chrome/.test(ua);
  // 최신 iPad는 desktop mode에서 Macintosh UA를 보냄 — 터치 포인트로 구분
  const isIpadDesktopSafari =
    /Macintosh/.test(ua) &&
    typeof navigator.maxTouchPoints === "number" &&
    navigator.maxTouchPoints > 1 &&
    !/Chrome/.test(ua);

  const isAndroid = /Android/.test(ua);

  if (!isIphone && !isIpadSafari && !isIpadDesktopSafari && !isAndroid) return false;
  return (
    typeof navigator.share === "function" &&
    typeof navigator.canShare === "function" &&
    navigator.canShare({ files })
  );
}

export async function zipAndDownload(files: File[], zipName = "your-moment.zip") {
  const buffers = await Promise.all(files.map((f) => f.arrayBuffer()));
  const entries: Record<string, Uint8Array> = {};
  files.forEach((f, i) => {
    entries[f.name] = new Uint8Array(buffers[i]);
  });
  const zipped = zipSync(entries);
  const blob = new Blob([zipped], { type: "application/zip" });
  const objUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objUrl;
  a.download = zipName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(objUrl), 2000);
}

export function fallbackDownload(file: File) {
  const objUrl = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = objUrl;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(objUrl), 2000);
}
