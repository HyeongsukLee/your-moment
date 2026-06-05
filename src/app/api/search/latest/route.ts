import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const eventId = searchParams.get("eventId");
  if (!eventId) {
    return Response.json({ error: "eventId required" }, { status: 400 });
  }

  const search = await db.search.findFirst({
    where: { userId: session.user.id, eventId },
    orderBy: { createdAt: "desc" },
    include: {
      results: {
        select: { photoId: true },
      },
    },
  });

  if (!search) return Response.json(null);

  return Response.json({
    searchId: search.id,
    resultCount: search.results.length,
    photoIds: search.results.map((r) => r.photoId),
  });
}
