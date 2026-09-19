import { Pause, Play, SkipBack } from "lucide-react";
import { useCallback, useEffect, useRef, type RefObject } from "react";
import { Button } from "@/components/ui/button";
import { activeCaption, drawCaption } from "@/lib/video/captions";
import { ASPECTS } from "@/lib/types";
import { clipAtTime, timelineDuration, useStudio } from "@/lib/store";
import { drawCover, drawTransition } from "@/lib/transitions";
import { formatTimecode } from "@/lib/utils";

function attachSrc(el: HTMLVideoElement, url: string) {
  if (el.getAttribute("src") !== url) {
    el.src = url;
    el.load();
  }
}

export function PreviewStage({
  canvasRef,
}: {
  canvasRef: RefObject<HTMLCanvasElement | null>;
}) {
  const videoARef = useRef<HTMLVideoElement>(null);
  const videoBRef = useRef<HTMLVideoElement>(null);
  const dubRef = useRef<HTMLAudioElement>(null);
  const clockRef = useRef({ originWall: 0, originTime: 0 });
  const rafRef = useRef(0);
  const lastUiRef = useRef(0);

  const clips = useStudio((s) => s.clips);
  const assets = useStudio((s) => s.assets);
  const playhead = useStudio((s) => s.playhead);
  const playing = useStudio((s) => s.playing);
  const captions = useStudio((s) => s.captions);
  const captionStyle = useStudio((s) => s.captionStyle);
  const dubbing = useStudio((s) => s.dubbing);
  const originalVolume = useStudio((s) => s.originalVolume);
  const dubVolume = useStudio((s) => s.dubVolume);
  const aspect = useStudio((s) => s.aspect);
  const setPlayhead = useStudio((s) => s.setPlayhead);
  const setPlaying = useStudio((s) => s.setPlaying);

  const size = ASPECTS[aspect];
  const canvasW = size.w === 16 ? 1280 : size.w === 1 ? 1080 : 720;
  const canvasH = size.h === 9 ? 720 : size.h === 1 ? 1080 : 1280;
  const total = timelineDuration(clips);

  const paint = useCallback(
    (time: number) => {
      const canvas = canvasRef.current;
      const a = videoARef.current;
      const b = videoBRef.current;
      if (!canvas || !a) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = "#0a0a0c";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      if (!clips.length) return;

      const at = clipAtTime(clips, time);
      if (!at) return;
      const { clip, index, local, duration } = at;
      const asset = assets.find((x) => x.id === clip.assetId);
      if (!asset) return;
      attachSrc(a, asset.objectUrl);

      const transDur = index === 0 ? 0 : Math.min(clip.transitionDuration, duration * 0.45);
      const inTrans = transDur > 0 && local < transDur && index > 0;
      const desiredA = clip.srcStart + local;

      if (a.readyState >= 2) {
        if (Math.abs(a.currentTime - desiredA) > 0.25 && !a.seeking) {
          a.currentTime = desiredA;
        }
      }

      if (inTrans && b) {
        const prev = clips[index - 1];
        const prevAsset = assets.find((x) => x.id === prev.assetId);
        if (prevAsset) {
          attachSrc(b, prevAsset.objectUrl);
          const t = local / transDur;
          const prevLocal = prev.srcEnd - transDur * (1 - t);
          if (b.readyState >= 2 && Math.abs(b.currentTime - prevLocal) > 0.25 && !b.seeking) {
            b.currentTime = Math.max(prev.srcStart, prevLocal);
          }
          if (a.readyState >= 2 && b.readyState >= 2) {
            drawTransition(ctx, b, a, t, clip.transitionIn, canvas.width, canvas.height);
          } else if (a.readyState >= 2) {
            drawCover(ctx, a, canvas.width, canvas.height);
          }
        } else if (a.readyState >= 2) {
          drawCover(ctx, a, canvas.width, canvas.height);
        }
      } else if (a.readyState >= 2) {
        drawCover(ctx, a, canvas.width, canvas.height);
      }

      const cap = activeCaption(captions, time);
      if (cap) {
        const p = (time - cap.start) / Math.max(0.01, cap.end - cap.start);
        drawCaption(ctx, cap.text, captionStyle, canvas.width, canvas.height, p);
      }
    },
    [assets, canvasRef, captionStyle, captions, clips],
  );

  useEffect(() => {
    const a = videoARef.current;
    const b = videoBRef.current;
    const redraw = () => paint(useStudio.getState().playhead);
    a?.addEventListener("loadeddata", redraw);
    a?.addEventListener("seeked", redraw);
    b?.addEventListener("loadeddata", redraw);
    b?.addEventListener("seeked", redraw);
    return () => {
      a?.removeEventListener("loadeddata", redraw);
      a?.removeEventListener("seeked", redraw);
      b?.removeEventListener("loadeddata", redraw);
      b?.removeEventListener("seeked", redraw);
    };
  }, [paint]);

  useEffect(() => {
    const a = videoARef.current;
    if (!a || !clips[0]) return;
    const asset = assets.find((x) => x.id === clips[0].assetId);
    if (!asset) return;
    attachSrc(a, asset.objectUrl);
    const at = clipAtTime(clips, useStudio.getState().playhead);
    if (at) {
      const t = at.clip.srcStart + at.local;
      const onReady = () => {
        if (Math.abs(a.currentTime - t) > 0.04) a.currentTime = t;
        else paint(useStudio.getState().playhead);
      };
      if (a.readyState >= 2) onReady();
      else a.addEventListener("loadeddata", onReady, { once: true });
    }
  }, [assets, clips, paint]);

  useEffect(() => {
    if (!playing) paint(playhead);
  }, [paint, playhead, playing, aspect, canvasW, canvasH]);

  useEffect(() => {
    const a = videoARef.current;
    const b = videoBRef.current;
    const dub = dubRef.current;
    if (a) a.volume = originalVolume;
    if (b) b.volume = 0;
    if (dub) dub.volume = dubVolume;
  }, [originalVolume, dubVolume]);

  useEffect(() => {
    const dub = dubRef.current;
    if (!dub || !dubbing) return;
    if (dub.getAttribute("src") !== dubbing.audioUrl) dub.src = dubbing.audioUrl;
  }, [dubbing]);

  useEffect(() => {
    const a = videoARef.current;
    const dub = dubRef.current;
    if (!playing) {
      a?.pause();
      videoBRef.current?.pause();
      dub?.pause();
      cancelAnimationFrame(rafRef.current);
      return;
    }
    const start = useStudio.getState().playhead;
    clockRef.current = { originWall: performance.now(), originTime: start };
    const at = clipAtTime(useStudio.getState().clips, start);
    if (at && a) {
      const asset = useStudio.getState().assets.find((x) => x.id === at.clip.assetId);
      if (asset) attachSrc(a, asset.objectUrl);
      a.currentTime = at.clip.srcStart + at.local;
    }
    void a?.play().catch(() => undefined);
    if (dubbing && dub) {
      dub.currentTime = Math.min(start, dub.duration || 0);
      void dub.play().catch(() => undefined);
    }

    const tick = (now: number) => {
      const t = clockRef.current.originTime + (now - clockRef.current.originWall) / 1000;
      const dur = timelineDuration(useStudio.getState().clips);
      if (t >= dur) {
        setPlayhead(dur);
        setPlaying(false);
        paint(dur);
        return;
      }
      paint(t);
      if (now - lastUiRef.current > 50) {
        lastUiRef.current = now;
        setPlayhead(t);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing, dubbing, paint, setPlayhead, setPlaying]);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 items-center justify-center p-3">
        <div
          className="phone-bezel relative h-full max-h-full w-auto overflow-hidden rounded-2xl bg-bg"
          style={{ aspectRatio: `${size.w} / ${size.h}` }}
        >
          <canvas
            ref={canvasRef}
            width={canvasW}
            height={canvasH}
            className="block size-full"
          />
          {!clips.length ? (
            <div className="absolute inset-0 grid place-items-center bg-elevated/40 px-6 text-center">
              <p className="text-sm text-muted">영상을 가져오면 여기에 미리보기가 열립니다.</p>
            </div>
          ) : null}
        </div>
      </div>
      <div className="flex shrink-0 items-center justify-center gap-3 pb-3">
        <Button
          variant="secondary"
          size="icon"
          aria-label="처음으로"
          onClick={() => {
            setPlaying(false);
            setPlayhead(0);
          }}
        >
          <SkipBack />
        </Button>
        <Button
          variant="solid"
          size="icon"
          className="size-12 rounded-full"
          aria-label={playing ? "일시정지" : "재생"}
          onClick={() => setPlaying(!playing)}
          disabled={!clips.length}
        >
          {playing ? <Pause className="size-5" /> : <Play className="size-5 translate-x-px fill-current" />}
        </Button>
        <span className="min-w-28 font-mono text-xs tabular-nums text-muted">
          {formatTimecode(playhead)} / {formatTimecode(total)}
        </span>
      </div>
      <div className="pointer-events-none absolute top-0 left-0 h-24 w-16 overflow-hidden opacity-0">
        <video ref={videoARef} className="size-full" playsInline preload="auto" />
        <video ref={videoBRef} className="size-full" playsInline preload="auto" muted />
        <audio ref={dubRef} preload="auto" />
      </div>
    </div>
  );
}
