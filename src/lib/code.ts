import { customAlphabet } from "nanoid";

// 혼동되는 글자(0/O, 1/l/I) 제외한 안전한 알파벳으로 8자 코드 생성.
// 그룹/행사 공유 링크(/join/<code>, /e/<code>)에 사용.
const nano = customAlphabet("abcdefghijkmnpqrstuvwxyz23456789", 8);

export function generateCode() {
  return nano();
}
