"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import CoverEditor from "@/components/CoverEditor";

type Photo = { id: string; thumbnailUrl: string };
type EventInfo = { name: string };

export default function AdminCoverEditPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const router = useRouter();
  const [event, setEvent] = useState<EventInfo | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [coverId, setCoverId] = useState<string | null>(null);
  const [coverPosition, setCoverPosition] = useState<string | null>(null);
  const [editPhoto, setEditPhoto] = useState<Photo | null>(null);

  useEffect(() => {
    fetch(`/api/events/${eventId}/photos`)
      .then((r) => r.json())
      .then((data) => {
        setEvent(data.event ?? null);
        setPhotos(data.photos ?? []);
        setCoverId(data.coverPhotoId ?? null);
        setCoverPosition(data.coverPosition ?? null);
        setLoading(false);
      });
  }, [eventId]);

  return (
    <div className="max-w-md mx-auto px-4 py-6 pb-12">
      <header className="flex items-center gap-3 mb-2">
        <button onClick={() => router.push("/admin/cover")} className="text-gray-400">
          ←
        </button>
        <h1 className="text-lg font-bold flex-1 truncate">
          {event?.name ?? "대표 사진 설정"}
        </h1>
      </header>
      <p className="text-sm text-gray-400 mb-4">
        대표로 쓸 사진의 ☆ 를 눌러 위치까지 정하세요
      </p>

      {loading ? (
        <div className="flex items-center justify-center h-64 text-gray-500">
          불러오는 중...
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-0.5">
          {photos.map((photo) => (
            <div key={photo.id} className="aspect-square relative bg-gray-900">
              <Image
                src={photo.thumbnailUrl}
                alt=""
                fill
                className="object-cover"
                sizes="33vw"
              />
              <button
                onClick={() => setEditPhoto(photo)}
                className={`absolute top-1 right-1 w-7 h-7 rounded-full flex items-center justify-center text-sm backdrop-blur ${
                  coverId === photo.id
                    ? "bg-yellow-400 text-black"
                    : "bg-black/50 text-white"
                }`}
                aria-label="대표 사진으로 지정"
              >
                {coverId === photo.id ? "★" : "☆"}
              </button>
            </div>
          ))}
        </div>
      )}

      {editPhoto && (
        <CoverEditor
          eventId={eventId}
          photo={editPhoto}
          initialPosition={editPhoto.id === coverId ? coverPosition : null}
          onClose={() => setEditPhoto(null)}
          onSaved={(photoId, position) => {
            setCoverId(photoId);
            setCoverPosition(position);
            setEditPhoto(null);
          }}
        />
      )}
    </div>
  );
}
