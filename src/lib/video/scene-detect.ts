import type { DetectedScene, FrameSample, MediaAsset } from "@/lib/types";
import { evenTimes, extractFrames } from "@/lib/video/extract-frames";

export async function detectScenes(
  video: HTMLVideoElement,
  asset: MediaAsset,
): Promise<{ scenes: DetectedScene[]; frames: FrameSample[] }> {
  const duration = asset.duration;
  const sampleCount = Math.min(36, Math.max(10, Math.round(duration * 3)));
  const times = evenTimes(duration, sampleCount);
  const frames = await extractFrames(video, times, 240);

  const motions = frames.map((f) => f.motion);
  const mean = motions.reduce((a, b) => a + b, 0) / Math.max(1, motions.length);
  const threshold = Math.max(0.045, mean * 1.55);

  const cuts = [0];
  for (let i = 1; i < frames.length; i++) {
    if (frames[i].motion > threshold) {
      const t = frames[i].time;
      if (t - cuts[cuts.length - 1] >= 0.7) cuts.push(t);
    }
  }
  if (duration - cuts[cuts.length - 1] < 0.5 && cuts.length > 1) {
    cuts.pop();
  }

  const scenes: DetectedScene[] = [];
  for (let i = 0; i < cuts.length; i++) {
    const start = cuts[i];
    const end = i + 1 < cuts.length ? cuts[i + 1] : duration;
    const mid = (start + end) / 2;
    const nearby = frames.reduce(
      (best, f) => (Math.abs(f.time - mid) < Math.abs(best.time - mid) ? f : best),
      frames[0],
    );
    const inRange = frames.filter((f) => f.time >= start && f.time <= end);
    const motion = inRange.reduce((a, f) => a + f.motion, 0) / Math.max(1, inRange.length);
    scenes.push({
      start,
      end,
      motion,
      thumbnail: nearby?.dataUrl ?? "",
      assetId: asset.id,
    });
  }

  return { scenes, frames };
}

export function pickAnalysisFrames(frames: FrameSample[], max = 6): FrameSample[] {
  if (frames.length <= max) return frames;
  const scored = [...frames].sort((a, b) => b.motion - a.motion);
  const chosen = new Set<number>();
  chosen.add(0);
  chosen.add(frames.length - 1);
  for (const f of scored) {
    if (chosen.size >= max) break;
    const idx = frames.indexOf(f);
    if (![...chosen].some((i) => Math.abs(frames[i].time - f.time) < 0.8)) {
      chosen.add(idx);
    }
  }
  return [...chosen].sort((a, b) => a - b).map((i) => frames[i]);
}
