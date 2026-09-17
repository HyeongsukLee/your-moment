/**
 * 업로드 허용 형식의 단일 진실 원천.
 *
 * 서버(api/admin/upload-url)와 파일 선택 UI가 **반드시 이 정의를 함께 읽는다.**
 * 예전에는 UI가 accept="image/*"로 모든 이미지를 허용하는데 서버는 4종만
 * 받아서, 고를 수는 있는데 업로드는 실패하는 상태였다. 두 곳이 다시 어긋나지
 * 않게 하려면 형식을 바꿀 때 이 파일만 고치면 되도록 유지할 것.
 *
 * ⚠️ 이 파일은 src/lib 중 예외적으로 **클라이언트 컴포넌트에서 임포트 가능**하다.
 * 그러려면 순수해야 하므로 여기에 어떤 import도 추가하지 말 것
 * (특히 @/lib/db, AWS SDK — 번들에 딸려 들어간다).
 *
 * JPEG만 허용하는 이유: 원본이 그대로 Rekognition으로 넘어가는데
 * (src/lib/rekognition.ts의 indexFace) Rekognition은 JPEG/PNG만 읽는다.
 * 썸네일 생성도 createImageBitmap에 의존해 HEIC를 디코드하지 못한다.
 */

// image/jpg는 비표준이지만 일부 클라이언트·OS가 진짜 JPEG에 이 MIME을 붙인다.
// 거부하면 "JPEG인데 왜 안 돼?"가 되므로 함께 받는다.
export const ALLOWED_UPLOAD_TYPES = ["image/jpeg", "image/jpg"] as const;

/** 파일 선택창의 accept 속성값. 확장자를 함께 적어야 일부 안드로이드 갤러리에서 JPG가 보인다. */
export const UPLOAD_ACCEPT = "image/jpeg,.jpg,.jpeg";

/** 사용자에게 보여줄 형식 이름 */
export const ALLOWED_UPLOAD_LABEL = "JPG";

export function isAllowedUploadType(type: string | undefined | null): boolean {
  if (!type) return false;
  return (ALLOWED_UPLOAD_TYPES as readonly string[]).includes(type.toLowerCase());
}

/** File 객체가 허용 형식인지. 브라우저가 MIME을 못 읽는 경우 확장자로 보조 판정한다. */
export function isAllowedUploadFile(file: File): boolean {
  if (isAllowedUploadType(file.type)) return true;
  if (file.type) return false; // MIME은 읽혔는데 허용 목록에 없음 → 거부
  return /\.jpe?g$/i.test(file.name);
}
