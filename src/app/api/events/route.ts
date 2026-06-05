import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const events = await db.event.findMany({
    where: { isActive: true },
    orderBy: { date: "desc" },
    select: {
      id: true,
      name: true,
      description: true,
      date: true,
      thumbnailUrl: true,
      _count: { select: { photos: true } },
    },
  });

  return Response.json(events);
}
