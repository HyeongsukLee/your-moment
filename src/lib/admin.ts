import { auth } from "@/lib/auth";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim())
  .filter(Boolean);

export function isAdminEmail(email?: string | null) {
  return !!email && ADMIN_EMAILS.includes(email);
}

/** 현재 세션이 관리자면 session을 반환, 아니면 null */
export async function requireAdmin() {
  const session = await auth();
  if (!isAdminEmail(session?.user?.email)) return null;
  return session;
}
