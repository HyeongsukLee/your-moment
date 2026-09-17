import { db } from "@/lib/db";

export type ActivityType = "LOGIN" | "EVENT_VIEW" | "DOWNLOAD";

/**
 * 참가자 활동 기록 (관리자 통계용).
 *
 * 통계는 부가 기능이므로 기록 실패가 로그인·갤러리 조회·다운로드 같은
 * 본 기능을 막아서는 안 된다. 모든 함수는 내부에서 예외를 삼킨다.
 */
export async function logActivity(
  userId: string,
  type: ActivityType,
  meta?: { eventId?: string | null; photoId?: string | null }
): Promise<void> {
  try {
    await db.activityLog.create({
      data: {
        userId,
        type,
        eventId: meta?.eventId ?? null,
        photoId: meta?.photoId ?? null,
      },
    });
  } catch (e) {
    console.error(`[activity] ${type} 기록 실패`, e);
  }
}

/** 다운로드는 사진 1장 = 1행. 한 번의 요청으로 받은 사진들을 한꺼번에 기록한다. */
export async function logDownloads(
  userId: string,
  photos: { id: string; eventId: string }[]
): Promise<void> {
  if (photos.length === 0) return;
  try {
    await db.activityLog.createMany({
      data: photos.map((p) => ({
        userId,
        type: "DOWNLOAD",
        eventId: p.eventId,
        photoId: p.id,
      })),
    });
  } catch (e) {
    console.error("[activity] DOWNLOAD 기록 실패", e);
  }
}
