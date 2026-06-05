"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";

type Photo = { id: string; thumbnailUrl: string };

export default function SearchResultPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const searchId = searchParams.get("searchId");

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!searchId) return;
    fetch(`/api/search/${searchId}`)
      .then((r) => r.json())
      .then((data) => setPhotos(data.results ?? []));
  }, [searchId]);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function downloadSelected(ids: string[]) {
    setDownloading(true);
    const res = await fetch("/api/download", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ photoIds: ids }),
    });
    const { urls } = await res.json();
    for (const { url } of urls) {
      const a = document.createElement("a");
      a.href = url;
      a.download = "";
      a.click();
    }
    setDownloading(false);
  }

  return (
    <div className="max-w-md mx-auto pb-32">
      <div className="sticky top-0 z-10 bg-gray-950/90 backdrop-blur px-4 py-4 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-gray-400">
          ←
        </button>
        <h1 className="font-semibold text-lg flex-1">내 사진 {photos.length}장</h1>
        {selected.size > 0 && (
          <span className="text-indigo-400 text-sm">{selected.size}개 선택</span>
        )}
      </div>

      {photos.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-500">
          <span className="text-4xl">🔍</span>
          <p>찾은 사진이 없어요</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-0.5 px-0.5">
          {photos.map((photo) => (
            <div
              key={photo.id}
              onClick={() => toggleSelect(photo.id)}
              className={`aspect-square relative bg-gray-900 cursor-pointer ${
                selected.has(photo.id) ? "ring-2 ring-indigo-500 ring-inset" : ""
              }`}
            >
              <Image
                src={photo.thumbnailUrl}
                alt=""
                fill
                className="object-cover"
                sizes="50vw"
              />
              {selected.has(photo.id) && (
                <div className="absolute top-2 right-2 bg-indigo-600 rounded-full w-6 h-6 flex items-center justify-center text-xs">
                  ✓
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="fixed bottom-8 left-0 right-0 px-6 flex flex-col gap-3 max-w-md mx-auto">
        {selected.size > 0 && (
          <button
            onClick={() => downloadSelected([...selected])}
            disabled={downloading}
            className="w-full bg-white text-black font-semibold py-4 rounded-2xl text-base disabled:opacity-60"
          >
            선택한 {selected.size}장 다운로드
          </button>
        )}
        <button
          onClick={() => downloadSelected(photos.map((p) => p.id))}
          disabled={downloading || photos.length === 0}
          className="w-full bg-indigo-600 text-white font-semibold py-4 rounded-2xl text-base disabled:opacity-60 shadow-lg shadow-indigo-900/50"
        >
          {downloading ? "다운로드 중..." : `전체 ${photos.length}장 다운로드`}
        </button>
      </div>
    </div>
  );
}
