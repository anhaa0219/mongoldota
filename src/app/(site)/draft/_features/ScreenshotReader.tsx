"use client";

import { ImageUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { limitMessage, localTime } from "@/lib/ai/ai-limits";
import type { DraftSlots, RecognizeResponse } from "@/types/draft";
import { useWords } from "@/lib/i18n/use-words";

/** Wide enough to keep small hero icons readable, small enough to upload fast. */
const MAX_WIDTH = 2048;

/** "limited": an AI limit was reached; shown calmly, not as an error. */
type Status = { kind: "idle" } | { kind: "reading" } | { kind: "done" | "error" | "limited"; message: string };

/** Scales big screenshots down and re-encodes them as JPEG before upload. */
async function shrink(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_WIDTH / bitmap.width);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return await new Promise((resolve) => canvas.toBlob((blob) => resolve(blob ?? file), "image/jpeg", 0.9));
  } catch {
    return file; // Browser cannot decode it: let the server decide.
  }
}

/** `failed`: the message when the request itself fails. */
async function recognize(file: File, failed: string): Promise<RecognizeResponse> {
  try {
    const form = new FormData();
    form.append("image", await shrink(file), "draft.jpg");
    const response = await fetch("/api/draft/recognize", { method: "POST", body: form });
    return (await response.json()) as RecognizeResponse;
  } catch {
    return { error: failed };
  }
}

/** Upload, paste (Ctrl/Cmd+V) or drop a draft screenshot; the recognised heroes replace the board. */
export function ScreenshotReader({ onRecognized }: { onRecognized: (draft: DraftSlots) => void }) {
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const words = useWords().draft.screenshot;
  const aiWords = useWords().ai;
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const onRecognizedRef = useRef(onRecognized);
  useEffect(() => {
    onRecognizedRef.current = onRecognized;
  }, [onRecognized]);

  const read = async (file: File | undefined) => {
    if (!file || !file.type.startsWith("image/")) return;
    setStatus({ kind: "reading" });
    const result = await recognize(file, words.failed);
    if ("limit" in result) return setStatus({ kind: "limited", message: limitMessage(result.limit, localTime, aiWords) });
    if ("error" in result) return setStatus({ kind: "error", message: result.error });
    onRecognizedRef.current(result.draft);
    setStatus({ kind: "done", message: words.found(result.found) });
  };
  const readRef = useRef(read);
  useEffect(() => {
    readRef.current = read;
  });

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const file = [...(event.clipboardData?.files ?? [])].find((entry) => entry.type.startsWith("image/"));
      if (file) void readRef.current(file);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  const isReading = status.kind === "reading";
  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragging(false);
        void read(event.dataTransfer.files[0]);
      }}
      className={`order-last flex min-w-0 basis-full flex-wrap items-center gap-[0.8rem] rounded-[1rem] border border-dashed px-[0.9rem] py-[0.55rem] md:order-none md:basis-0 md:flex-1 ${
        isDragging ? "border-accent bg-accent/10" : "border-white/20"
      }`}
    >
      <button
        type="button"
        disabled={isReading}
        onClick={() => inputRef.current?.click()}
        className="flex items-center gap-[0.5rem] rounded-full bg-accent/90 px-[1.1rem] py-[0.45rem] text-[0.98rem] font-medium text-ink hover:bg-accent disabled:opacity-60"
      >
        <ImageUp className="size-[1.1rem]" aria-hidden="true" />
        {isReading ? words.reading : words.fill}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(event) => {
          void read(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      <p className={`min-w-0 flex-1 text-[0.92rem] ${status.kind === "error" ? "text-dire" : "text-white/60"}`} aria-live="polite">
        {status.kind === "idle" || status.kind === "reading" ? words.hint : status.message}
      </p>
    </div>
  );
}
