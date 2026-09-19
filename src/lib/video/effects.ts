import type { ClipEffectId, FitMode } from "@/lib/types";
import { drawCover, drawFit, easeInOut } from "@/lib/transitions";

export function drawClipFrame(
  ctx: CanvasRenderingContext2D,
  src: CanvasImageSource,
  w: number,
  h: number,
  effect: ClipEffectId,
  progress: number,
  fit: FitMode = "cover",
  focusX = 0.5,
  focusY = 0.5,
) {
  const p = easeInOut(Math.min(1, Math.max(0, progress)));
  let scale = 1;
  let ox = 0;
  let oy = 0;

  switch (effect) {
    case "kenburns-in":
      scale = 1.05 + p * 0.16;
      oy = (p - 0.5) * 0.05;
      break;
    case "kenburns-out":
      scale = 1.22 - p * 0.16;
      oy = (0.5 - p) * 0.04;
      break;
    case "pan-left":
      scale = 1.18;
      ox = 0.07 - p * 0.14;
      break;
    case "pan-right":
      scale = 1.18;
      ox = -0.07 + p * 0.14;
      break;
    case "punch":
      scale = 1.04 + Math.sin(p * Math.PI) * 0.1;
      break;
    default:
      drawFit(ctx, src, w, h, fit, focusX, focusY);
      return;
  }

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, w, h);
  ctx.clip();
  ctx.translate(w / 2 + ox * w, h / 2 + oy * h);
  ctx.scale(scale, scale);
  ctx.translate(-w / 2, -h / 2);
  if (fit === "blurfill") drawFit(ctx, src, w, h, fit, focusX, focusY);
  else drawCover(ctx, src, w, h, focusX, focusY);
  ctx.restore();
}
