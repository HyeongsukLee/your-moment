import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// 알림 읽음 처리. body.ids 있으면 해당 것만, 없으면 전체.
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { ids } = await req.json().catch(() => ({ ids: undefined }));

  await db.notification.updateMany({
    where: {
      userId: session.user.id,
      read: false,
      ...(Array.isArray(ids) && ids.length > 0 ? { id: { in: ids } } : {}),
    },
    data: { read: true },
  });

  return Response.json({ ok: true });
}
