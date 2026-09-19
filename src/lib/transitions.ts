import type { TransitionId } from "@/lib/types";

export type TransitionMeta = {
  id: TransitionId;
  label: string;
  group: "basic" | "wipe" | "motion" | "fx";
  hint: string;
  defaultDuration: number;
};

export const TRANSITIONS: TransitionMeta[] = [
  { id: "cut", label: "하드 컷", group: "basic", hint: "즉시 전환", defaultDuration: 0 },
  { id: "crossfade", label: "크로스 디졸브", group: "basic", hint: "부드럽게 겹침", defaultDuration: 0.4 },
  { id: "fadeblack", label: "블랙 페이드", group: "basic", hint: "암전 후 등장", defaultDuration: 0.5 },
  { id: "fadewhite", label: "화이트 플래시", group: "basic", hint: "플래시 컷", defaultDuration: 0.35 },
  { id: "wipe-left", label: "와이프 ←", group: "wipe", hint: "왼쪽에서 밀기", defaultDuration: 0.45 },
  { id: "wipe-right", label: "와이프 →", group: "wipe", hint: "오른쪽에서 밀기", defaultDuration: 0.45 },
  { id: "wipe-up", label: "와이프 ↑", group: "wipe", hint: "아래에서 밀기", defaultDuration: 0.45 },
  { id: "wipe-down", label: "와이프 ↓", group: "wipe", hint: "위에서 밀기", defaultDuration: 0.45 },
  { id: "slide-left", label: "슬라이드", group: "motion", hint: "클립이 밀려 나감", defaultDuration: 0.5 },
  { id: "slide-up", label: "푸시 업", group: "motion", hint: "위로 밀어 올리기", defaultDuration: 0.5 },
  { id: "zoom", label: "줌 인", group: "motion", hint: "다음 컷으로 확대", defaultDuration: 0.45 },
  { id: "zoom-out", label: "줌 아웃", group: "motion", hint: "빠져나오며 전환", defaultDuration: 0.45 },
  { id: "circle", label: "아이리스", group: "fx", hint: "원형으로 열림", defaultDuration: 0.5 },
  { id: "blur", label: "블러 디졸브", group: "fx", hint: "초점이 넘어감", defaultDuration: 0.5 },
  { id: "glitch", label: "글리치", group: "fx", hint: "RGB 분리 컷", defaultDuration: 0.35 },
  { id: "spin", label: "스핀", group: "fx", hint: "회전하며 교체", defaultDuration: 0.5 },
];

export const TRANSITION_MAP = Object.fromEntries(TRANSITIONS.map((t) => [t.id, t])) as Record<
  TransitionId,
  TransitionMeta
>;

export function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function coverDraw(
  ctx: CanvasRenderingContext2D,
  src: CanvasImageSource,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
) {
  const sw = (src as HTMLVideoElement).videoWidth || (src as HTMLCanvasElement).width || dw;
  const sh = (src as HTMLVideoElement).videoHeight || (src as HTMLCanvasElement).height || dh;
  if (!sw || !sh) return;
  const scale = Math.max(dw / sw, dh / sh);
  const tw = sw * scale;
  const th = sh * scale;
  ctx.drawImage(src, dx + (dw - tw) / 2, dy + (dh - th) / 2, tw, th);
}

export function drawTransition(
  ctx: CanvasRenderingContext2D,
  prev: CanvasImageSource,
  next: CanvasImageSource,
  rawT: number,
  type: TransitionId,
  w: number,
  h: number,
) {
  const t = easeInOut(Math.min(1, Math.max(0, rawT)));
  ctx.save();
  ctx.clearRect(0, 0, w, h);

  if (type === "cut") {
    coverDraw(ctx, next, 0, 0, w, h);
    ctx.restore();
    return;
  }

  if (type === "crossfade") {
    coverDraw(ctx, prev, 0, 0, w, h);
    ctx.globalAlpha = t;
    coverDraw(ctx, next, 0, 0, w, h);
    ctx.restore();
    return;
  }

  if (type === "fadeblack" || type === "fadewhite") {
    const fill = type === "fadeblack" ? "#000" : "#f4f4f5";
    if (t < 0.5) {
      coverDraw(ctx, prev, 0, 0, w, h);
      ctx.globalAlpha = t * 2;
    } else {
      coverDraw(ctx, next, 0, 0, w, h);
      ctx.globalAlpha = (1 - t) * 2;
    }
    ctx.fillStyle = fill;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
    return;
  }

  if (type === "wipe-left" || type === "wipe-right" || type === "wipe-up" || type === "wipe-down") {
    coverDraw(ctx, prev, 0, 0, w, h);
    ctx.beginPath();
    if (type === "wipe-left") ctx.rect(0, 0, w * t, h);
    else if (type === "wipe-right") ctx.rect(w * (1 - t), 0, w * t, h);
    else if (type === "wipe-up") ctx.rect(0, h * (1 - t), w, h * t);
    else ctx.rect(0, 0, w, h * t);
    ctx.clip();
    coverDraw(ctx, next, 0, 0, w, h);
    ctx.restore();
    return;
  }

  if (type === "slide-left") {
    coverDraw(ctx, prev, -w * t, 0, w, h);
    coverDraw(ctx, next, w * (1 - t), 0, w, h);
    ctx.restore();
    return;
  }

  if (type === "slide-up") {
    coverDraw(ctx, prev, 0, -h * t, w, h);
    coverDraw(ctx, next, 0, h * (1 - t), w, h);
    ctx.restore();
    return;
  }

  if (type === "zoom") {
    const s = 1 + t * 0.35;
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.scale(s, s);
    ctx.globalAlpha = 1 - t;
    coverDraw(ctx, prev, -w / 2, -h / 2, w, h);
    ctx.restore();
    ctx.globalAlpha = t;
    coverDraw(ctx, next, 0, 0, w, h);
    ctx.restore();
    return;
  }

  if (type === "zoom-out") {
    const s = 1.25 - t * 0.25;
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.scale(s, s);
    ctx.globalAlpha = t;
    coverDraw(ctx, next, -w / 2, -h / 2, w, h);
    ctx.restore();
    ctx.globalAlpha = 1 - t;
    coverDraw(ctx, prev, 0, 0, w, h);
    ctx.restore();
    return;
  }

  if (type === "circle") {
    coverDraw(ctx, prev, 0, 0, w, h);
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, Math.hypot(w, h) * 0.5 * t, 0, Math.PI * 2);
    ctx.clip();
    coverDraw(ctx, next, 0, 0, w, h);
    ctx.restore();
    return;
  }

  if (type === "blur") {
    ctx.filter = `blur(${(1 - t) * 14}px)`;
    ctx.globalAlpha = 1 - t;
    coverDraw(ctx, prev, 0, 0, w, h);
    ctx.filter = `blur(${t * 10}px)`;
    ctx.globalAlpha = t;
    coverDraw(ctx, next, 0, 0, w, h);
    ctx.restore();
    return;
  }

  if (type === "glitch") {
    coverDraw(ctx, prev, 0, 0, w, h);
    const slices = 8;
    for (let i = 0; i < slices; i++) {
      const y = (h / slices) * i;
      const hh = h / slices;
      const jitter = (Math.sin(i * 12.7 + t * 40) * 18 + Math.cos(i * 7.1) * 10) * (1 - t);
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, y, w, hh);
      ctx.clip();
      ctx.globalCompositeOperation = i % 2 === 0 ? "screen" : "source-over";
      ctx.globalAlpha = 0.45 + t * 0.55;
      coverDraw(ctx, next, jitter, 0, w, h);
      ctx.restore();
    }
    ctx.globalAlpha = t;
    coverDraw(ctx, next, 0, 0, w, h);
    ctx.restore();
    return;
  }

  if (type === "spin") {
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.rotate(-t * Math.PI);
    ctx.globalAlpha = 1 - t;
    ctx.scale(1 - t * 0.2, 1 - t * 0.2);
    coverDraw(ctx, prev, -w / 2, -h / 2, w, h);
    ctx.restore();
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.rotate((1 - t) * Math.PI);
    ctx.globalAlpha = t;
    coverDraw(ctx, next, -w / 2, -h / 2, w, h);
    ctx.restore();
    ctx.restore();
    return;
  }

  coverDraw(ctx, next, 0, 0, w, h);
  ctx.restore();
}

export function drawCover(
  ctx: CanvasRenderingContext2D,
  src: CanvasImageSource,
  w: number,
  h: number,
) {
  coverDraw(ctx, src, 0, 0, w, h);
}
