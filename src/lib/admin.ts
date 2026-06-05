import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Session } from "next-auth";

/** 관리자 전용. role===ADMIN 이면 session 반환, 아니면 null */
export async function requireAdmin(): Promise<Session | null> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return null;
  return session;
}

/** 운영진(관리자 또는 작가). 관리자 페이지 접근·행사 생성용 */
export async function requireStaff(): Promise<Session | null> {
  const session = await auth();
  const role = session?.user?.role;
  if (role !== "ADMIN" && role !== "PHOTOGRAPHER") return null;
  return session;
}

/**
 * 특정 행사에 업로드/관리할 수 있는지 검증.
 * - ADMIN: 모든 행사
 * - PHOTOGRAPHER: 관리자가 배정한(photographers) 행사만
 */
export async function canUploadToEvent(
  eventId: string
): Promise<Session | null> {
  const session = await auth();
  const role = session?.user?.role;
  if (role === "ADMIN") return session;
  if (role === "PHOTOGRAPHER") {
    const assigned = await db.event.findFirst({
      where: { id: eventId, photographers: { some: { id: session!.user.id } } },
      select: { id: true },
    });
    if (assigned) return session;
  }
  return null;
}

/**
 * 특정 사진을 삭제할 수 있는지 검증.
 * - ADMIN: 모든 사진
 * - PHOTOGRAPHER: 본인이 올린(uploaderId) 사진만
 */
export async function canDeletePhoto(
  photoId: string
): Promise<{ session: Session; photo: { id: string; s3Key: string; thumbnailKey: string; rekognitionId: string | null } } | null> {
  const session = await auth();
  const role = session?.user?.role;
  if (role !== "ADMIN" && role !== "PHOTOGRAPHER") return null;

  const photo = await db.photo.findUnique({
    where: { id: photoId },
    select: { id: true, s3Key: true, thumbnailKey: true, rekognitionId: true, uploaderId: true },
  });
  if (!photo) return null;

  if (role === "ADMIN" || photo.uploaderId === session!.user.id) {
    return { session: session!, photo };
  }
  return null;
}
