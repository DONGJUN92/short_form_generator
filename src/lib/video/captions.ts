import type { Caption, CaptionStyleId } from "@/lib/types";

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const lines: string[] = [];
  let cur = words[0];
  for (let i = 1; i < words.length; i++) {
    const test = `${cur} ${words[i]}`;
    if (ctx.measureText(test).width <= maxWidth) cur = test;
    else {
      lines.push(cur);
      cur = words[i];
    }
  }
  lines.push(cur);
  if (lines.length === 1 && ctx.measureText(lines[0]).width > maxWidth) {
    const chars = text.split("");
    const out: string[] = [];
    let buf = "";
    for (const ch of chars) {
      if (ctx.measureText(buf + ch).width > maxWidth) {
        if (buf) out.push(buf);
        buf = ch;
      } else buf += ch;
    }
    if (buf) out.push(buf);
    return out.slice(0, 3);
  }
  return lines.slice(0, 3);
}

export function activeCaption(captions: Caption[], time: number): Caption | null {
  return captions.find((c) => time >= c.start && time < c.end) ?? null;
}

export function drawCaption(
  ctx: CanvasRenderingContext2D,
  text: string,
  style: CaptionStyleId,
  w: number,
  h: number,
  progress: number,
) {
  if (!text.trim()) return;
  const base = Math.max(18, Math.round(w * 0.062));
  ctx.save();
  ctx.font = `700 ${base}px "Klipo CJK", "WenQuanYi Zen Hei", "Figtree", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const maxW = w * 0.82;
  const lines = wrapLines(ctx, text.trim(), maxW);
  const lineH = base * 1.28;
  const blockH = lines.length * lineH;
  const y0 = h * 0.78 - blockH / 2;

  if (style === "boxed" || style === "karaoke") {
    const padX = 18;
    const padY = 10;
    const bw = Math.min(
      maxW + padX * 2,
      Math.max(...lines.map((l) => ctx.measureText(l).width)) + padX * 2,
    );
    const bx = (w - bw) / 2;
    const by = y0 - padY;
    ctx.fillStyle = style === "karaoke" ? "rgba(5, 12, 12, 0.82)" : "rgba(10, 10, 12, 0.78)";
    roundRect(ctx, bx, by, bw, blockH + padY * 2, 10);
    ctx.fill();
    if (style === "karaoke") {
      const fillW = bw * Math.min(1, Math.max(0, progress));
      ctx.save();
      ctx.beginPath();
      roundRect(ctx, bx, by, fillW, blockH + padY * 2, 10);
      ctx.clip();
      ctx.fillStyle = "rgba(94, 234, 212, 0.28)";
      ctx.fillRect(bx, by, fillW, blockH + padY * 2);
      ctx.restore();
    }
  }

  lines.forEach((line, i) => {
    const x = w / 2;
    const y = y0 + lineH * i + lineH / 2;
    if (style === "classic" || style === "outline" || style === "karaoke") {
      ctx.lineJoin = "round";
      ctx.miterLimit = 2;
      ctx.strokeStyle = "rgba(0,0,0,0.88)";
      ctx.lineWidth = style === "outline" ? base * 0.22 : base * 0.16;
      ctx.strokeText(line, x, y);
    }
    ctx.fillStyle = style === "minimal" ? "rgba(244,244,245,0.86)" : "#f4f4f5";
    ctx.fillText(line, x, y);
  });
  ctx.restore();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}
