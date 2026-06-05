"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

type EventOption = { id: string; name: string; date: string; photoCount: number };

export default function AdminUploadPage() {
  const router = useRouter();
  const [events, setEvents] = useState<EventOption[]>([]);
  const [eventId, setEventId] = useState("");
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [uploading, setUploading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDate, setNewDate] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function loadEvents() {
    const res = await fetch("/api/admin/events");
    if (res.status === 403) {
      alert("관리자만 접근할 수 있습니다");
      router.push("/");
      return;
    }
    const data = await res.json();
    setEvents(data);
    if (data.length && !eventId) setEventId(data[0].id);
  }

  useEffect(() => {
    loadEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createEvent() {
    if (!newName.trim() || !newDate) {
      alert("이름과 날짜를 입력하세요");
      return;
    }
    setCreating(true);
    const res = await fetch("/api/admin/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName, date: newDate }),
    });
    setCreating(false);
    if (!res.ok) {
      alert("생성 실패");
      return;
    }
    const created = await res.json();
    setNewName("");
    setNewDate("");
    await loadEvents();
    setEventId(created.id);
  }

  async function uploadFiles(files: FileList) {
    if (!eventId) {
      alert("순간을 먼저 선택하거나 새로 만드세요");
      return;
    }

    setUploading(true);
    setProgress({ done: 0, total: files.length });

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // 1. Presigned URL 발급 (원본 + 썸네일)
      const urlRes = await fetch("/api/admin/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, contentType: file.type }),
      });
      const { photoId, s3Key, thumbnailKey, uploadUrl, thumbnailUploadUrl } =
        await urlRes.json();

      // 2. 썸네일 생성 (브라우저에서 리사이즈)
      const thumbBlob = await makeThumbnail(file, 400);

      // 3. S3에 원본 + 썸네일 동시 업로드
      await Promise.all([
        fetch(uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        }),
        fetch(thumbnailUploadUrl, {
          method: "PUT",
          headers: { "Content-Type": "image/jpeg" },
          body: thumbBlob,
        }),
      ]);

      // 4. Rekognition 인덱싱 + DB 저장
      await fetch("/api/admin/index-photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, photoId, s3Key, thumbnailKey }),
      });

      setProgress({ done: i + 1, total: files.length });
    }

    setUploading(false);
    await loadEvents();
    alert(`${files.length}장 업로드 완료!`);
  }

  // 원본 이미지를 maxSize px 비율 내로 리사이즈한 JPEG 썸네일 생성
  async function makeThumbnail(file: File, maxSize: number): Promise<Blob> {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, w, h);

    return new Promise<Blob>((resolve) =>
      canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.8)
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-6">
      <header className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push("/admin")} className="text-gray-400">
          ←
        </button>
        <h1 className="text-xl font-bold">사진 업로드</h1>
      </header>

      {/* 순간 선택 */}
      <label className="block mb-2 text-sm text-gray-400">순간 선택</label>
      <select
        value={eventId}
        onChange={(e) => setEventId(e.target.value)}
        className="w-full bg-gray-900 rounded-xl px-4 py-3 text-white mb-4 outline-none focus:ring-2 ring-indigo-500"
      >
        {events.length === 0 && <option value="">순간이 없습니다 — 아래에서 생성</option>}
        {events.map((ev) => (
          <option key={ev.id} value={ev.id}>
            {ev.name} ({new Date(ev.date).toLocaleDateString("ko-KR")}) · {ev.photoCount}장
          </option>
        ))}
      </select>

      {/* 새 순간 만들기 */}
      <details className="mb-6 bg-gray-900 rounded-xl p-4">
        <summary className="text-sm text-gray-300 cursor-pointer">＋ 새 순간 만들기</summary>
        <div className="mt-3 space-y-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="순간 이름 (예: 2026 서울 마라톤)"
            className="w-full bg-gray-800 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 ring-indigo-500"
          />
          <input
            type="date"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            className="w-full bg-gray-800 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 ring-indigo-500"
          />
          <button
            onClick={createEvent}
            disabled={creating}
            className="w-full bg-gray-700 active:bg-gray-600 text-white text-sm font-medium py-2.5 rounded-lg disabled:opacity-60"
          >
            {creating ? "생성 중..." : "순간 생성"}
          </button>
        </div>
      </details>

      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading || !eventId}
        className="w-full bg-indigo-600 active:bg-indigo-700 text-white font-semibold py-4 rounded-2xl text-base disabled:opacity-60"
      >
        {uploading ? "업로드 중..." : "📷 사진 선택 및 업로드"}
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && uploadFiles(e.target.files)}
      />

      {uploading && (
        <div className="mt-6">
          <div className="flex justify-between text-sm text-gray-400 mb-2">
            <span>얼굴 분석 + 업로드 중...</span>
            <span>
              {progress.done} / {progress.total}
            </span>
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-600 transition-all"
              style={{
                width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      )}

      <p className="text-xs text-gray-600 mt-6 leading-relaxed">
        업로드하면 사진 속 얼굴이 자동 분석되어, 참가자가 셀카로 자신을 검색할 수
        있게 됩니다. 썸네일은 브라우저에서 자동 생성됩니다.
      </p>
    </div>
  );
}
