import type { FrameSample } from "@/lib/types";

function waitSeeked(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const onSeeked = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error("영상을 읽을 수 없습니다."));
    };
    const cleanup = () => {
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("error", onError);
    };
    video.addEventListener("seeked", onSeeked, { once: true });
    video.addEventListener("error", onError, { once: true });
    const target = Math.min(Math.max(0, time), Math.max(0, video.duration - 0.04));
    if (Math.abs(video.currentTime - target) < 0.01 && !video.seeking) {
      cleanup();
      resolve();
      return;
    }
    video.currentTime = target;
  });
}

export async function extractFrames(
  video: HTMLVideoElement,
  times: number[],
  maxWidth = 360,
): Promise<FrameSample[]> {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("캔버스를 사용할 수 없습니다.");

  const srcW = video.videoWidth || 720;
  const srcH = video.videoHeight || 1280;
  const scale = maxWidth / srcW;
  canvas.width = Math.max(1, Math.round(srcW * scale));
  canvas.height = Math.max(1, Math.round(srcH * scale));

  const frames: FrameSample[] = [];
  let prev: ImageData | null = null;

  for (const time of times) {
    await waitSeeked(video, time);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let motion = 0;
    if (prev) {
      const a = prev.data;
      const b = data.data;
      let acc = 0;
      const step = 16 * 4;
      for (let i = 0; i < a.length; i += step) {
        acc += Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]);
      }
      motion = acc / ((a.length / step) * 765);
    }
    prev = data;
    frames.push({
      time,
      dataUrl: canvas.toDataURL("image/jpeg", 0.52),
      motion,
    });
  }

  return frames;
}

export function evenTimes(duration: number, count: number): number[] {
  if (duration <= 0 || count <= 0) return [];
  const n = Math.max(1, count);
  const times: number[] = [];
  for (let i = 0; i < n; i++) {
    times.push(((i + 0.5) / n) * duration);
  }
  return times;
}
