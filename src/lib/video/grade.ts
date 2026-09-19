import type { ColorGradeId } from "@/lib/types";

export function applyColorGrade(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  grade: ColorGradeId,
) {
  if (grade === "none") return;
  ctx.save();
  if (grade === "warm") {
    ctx.globalCompositeOperation = "soft-light";
    ctx.fillStyle = "rgba(255, 168, 96, 0.55)";
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = "overlay";
    ctx.fillStyle = "rgba(255, 210, 150, 0.18)";
    ctx.fillRect(0, 0, w, h);
  } else if (grade === "punch") {
    ctx.globalCompositeOperation = "overlay";
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = "multiply";
    ctx.fillStyle = "rgba(20, 16, 24, 0.12)";
    ctx.fillRect(0, 0, w, h);
  } else if (grade === "cinematic") {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, "rgba(20, 80, 90, 0.22)");
    g.addColorStop(1, "rgba(210, 120, 50, 0.2)");
    ctx.globalCompositeOperation = "soft-light";
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  } else if (grade === "pastel") {
    ctx.globalCompositeOperation = "screen";
    ctx.fillStyle = "rgba(255, 236, 244, 0.16)";
    ctx.fillRect(0, 0, w, h);
  }
  ctx.restore();
}
