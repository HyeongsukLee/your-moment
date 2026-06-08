import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// 내 알림 목록 + 안 읽은 수
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [items, unread] = await Promise.all([
    db.notification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        type: true,
        title: true,
        body: true,
        eventId: true,
        read: true,
        createdAt: true,
      },
    }),
    db.notification.count({
      where: { userId: session.user.id, read: false },
    }),
  ]);

  return Response.json({
    unread,
    items: items.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      eventId: n.eventId,
      read: n.read,
      createdAt: n.createdAt.toISOString(),
    })),
  });
}
