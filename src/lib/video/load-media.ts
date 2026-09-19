import { MAX_CLIP_SECONDS, type MediaAsset } from "@/lib/types";
import { uid } from "@/lib/utils";

export function loadVideoElement(url: string): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "auto";
    video.playsInline = true;
    video.muted = true;
    video.crossOrigin = "anonymous";
    video.src = url;
    const onReady = () => {
      cleanup();
      resolve(video);
    };
    const onError = () => {
      cleanup();
      reject(new Error("영상을 불러오지 못했습니다."));
    };
    const cleanup = () => {
      video.removeEventListener("loadedmetadata", onReady);
      video.removeEventListener("error", onError);
    };
    video.addEventListener("loadedmetadata", onReady);
    video.addEventListener("error", onError);
  });
}

export async function captureThumbnail(video: HTMLVideoElement): Promise<string> {
  const canvas = document.createElement("canvas");
  const w = video.videoWidth || 720;
  const h = video.videoHeight || 1280;
  const scale = 180 / w;
  canvas.width = Math.max(1, Math.round(w * scale));
  canvas.height = Math.max(1, Math.round(h * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  const t = Math.min(0.4, Math.max(0, (video.duration || 1) * 0.15));
  if (Math.abs(video.currentTime - t) > 0.05) {
    await new Promise<void>((resolve) => {
      video.addEventListener("seeked", () => resolve(), { once: true });
      video.currentTime = t;
    });
  }
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.7);
}

export async function mediaFromFile(file: File): Promise<MediaAsset> {
  if (!file.type.startsWith("video/")) {
    throw new Error("영상 파일만 올릴 수 있습니다.");
  }
  const objectUrl = URL.createObjectURL(file);
  try {
    const video = await loadVideoElement(objectUrl);
    const duration = video.duration;
    if (!Number.isFinite(duration) || duration <= 0) {
      throw new Error("영상 길이를 읽을 수 없습니다.");
    }
    if (duration > MAX_CLIP_SECONDS + 0.4) {
      throw new Error("1분 이하의 숏폼만 가져올 수 있습니다.");
    }
    const thumbnail = await captureThumbnail(video);
    video.pause();
    video.removeAttribute("src");
    video.load();
    return {
      id: uid("asset"),
      name: file.name.replace(/\.[^.]+$/, "") || "클립",
      duration,
      width: video.videoWidth,
      height: video.videoHeight,
      objectUrl,
      thumbnail,
    };
  } catch (err) {
    URL.revokeObjectURL(objectUrl);
    throw err;
  }
}

export async function mediaFromUrl(url: string, name: string): Promise<MediaAsset> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("샘플 영상을 불러오지 못했습니다.");
  const blob = await res.blob();
  const file = new File([blob], `${name}.mp4`, { type: blob.type || "video/mp4" });
  return mediaFromFile(file);
}
