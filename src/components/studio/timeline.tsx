import { useMemo, useRef } from "react";
import type { TimelineClip, TransitionId } from "@/lib/types";
import { clipAtTime, timelineDuration, useStudio } from "@/lib/store";
import { TRANSITION_MAP } from "@/lib/transitions";
import { cn, formatTimecode } from "@/lib/utils";

const PPS = 64;

export function Timeline() {
  const clips = useStudio((s) => s.clips);
  const assets = useStudio((s) => s.assets);
  const captions = useStudio((s) => s.captions);
  const playhead = useStudio((s) => s.playhead);
  const selectedClipId = useStudio((s) => s.selectedClipId);
  const setPlayhead = useStudio((s) => s.setPlayhead);
  const selectClip = useStudio((s) => s.selectClip);
  const reorderClips = useStudio((s) => s.reorderClips);
  const updateClip = useStudio((s) => s.updateClip);
  const setPlaying = useStudio((s) => s.setPlaying);
  const scroller = useRef<HTMLDivElement>(null);
  const total = timelineDuration(clips);
  const width = Math.max(640, total * PPS + 80);

  const ticks = useMemo(() => {
    const out: number[] = [];
    for (let t = 0; t <= total + 0.01; t += 1) out.push(t);
    return out;
  }, [total]);

  const onSeek = (clientX: number, currentTarget: HTMLElement) => {
    const rect = currentTarget.getBoundingClientRect();
    const x = clientX - rect.left + currentTarget.scrollLeft;
    const t = Math.max(0, Math.min(total, x / PPS));
    setPlaying(false);
    setPlayhead(t);
    const at = clipAtTime(clips, t);
    if (at) selectClip(at.clip.id);
  };

  return (
    <div className="flex h-36 shrink-0 flex-col border-t border-border bg-surface md:h-44">
      <div className="flex items-center justify-between px-4 py-2">
        <p className="text-[11px] font-medium tracking-wide text-muted uppercase">타임라인</p>
        <p className="font-mono text-[11px] tabular-nums text-subtle">{formatTimecode(total)}</p>
      </div>
      <div
        ref={scroller}
        className="relative min-h-0 flex-1 overflow-x-auto px-4 pb-3"
        onClick={(e) => onSeek(e.clientX, e.currentTarget)}
      >
        <div className="timeline-grid relative h-full" style={{ width }}>
          <div className="mb-1 flex h-4">
            {ticks.map((t) => (
              <span
                key={t}
                className="font-mono text-[10px] text-subtle"
                style={{ position: "absolute", left: t * PPS }}
              >
                {Math.floor(t)}s
              </span>
            ))}
          </div>
          <div className="relative mt-4 flex h-14 items-stretch">
            {clips.map((clip, i) => {
              const asset = assets.find((a) => a.id === clip.assetId);
              const dur = clip.srcEnd - clip.srcStart;
              return (
                <ClipBlock
                  key={clip.id}
                  clip={clip}
                  index={i}
                  width={dur * PPS}
                  thumbnail={asset?.thumbnail ?? ""}
                  name={asset?.name ?? "클립"}
                  selected={clip.id === selectedClipId}
                  onSelect={() => selectClip(clip.id)}
                  onDrop={(from) => reorderClips(from, i)}
                  onTransition={(id, duration) =>
                    updateClip(clip.id, { transitionIn: id, transitionDuration: duration })
                  }
                />
              );
            })}
            {!clips.length ? (
              <div className="grid h-14 w-full place-items-center rounded-md bg-elevated text-xs text-subtle">
                가져온 클립이 여기에 놓입니다
              </div>
            ) : null}
          </div>
          <div className="relative mt-2 flex h-8">
            {captions.map((cap) => (
              <div
                key={cap.id}
                className="absolute top-0 h-8 overflow-hidden rounded-sm bg-primary/15 px-1.5 text-[10px] leading-8 text-primary"
                style={{
                  left: cap.start * PPS,
                  width: Math.max(24, (cap.end - cap.start) * PPS - 4),
                }}
                title={cap.text}
              >
                {cap.text}
              </div>
            ))}
          </div>
          <div
            className="pointer-events-none absolute top-0 bottom-0 w-px bg-primary"
            style={{ left: playhead * PPS }}
          >
            <span className="absolute -top-1 -left-1.5 size-3 rounded-full bg-primary" />
          </div>
        </div>
      </div>
    </div>
  );
}

function ClipBlock({
  clip,
  index,
  width,
  thumbnail,
  name,
  selected,
  onSelect,
  onDrop,
  onTransition,
}: {
  clip: TimelineClip;
  index: number;
  width: number;
  thumbnail: string;
  name: string;
  selected: boolean;
  onSelect: () => void;
  onDrop: (from: number) => void;
  onTransition: (id: TransitionId, duration: number) => void;
}) {
  return (
    <div
      className="relative flex items-center"
      style={{ width }}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/clip-index", String(index));
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const from = Number(e.dataTransfer.getData("text/clip-index"));
        if (Number.isFinite(from)) onDrop(from);
      }}
    >
      {index > 0 ? (
        <button
          type="button"
          className="absolute -left-2 z-10 grid size-5 place-items-center rounded-full bg-elevated text-[9px] text-primary shadow-[0_0_0_1px_rgba(94,234,212,0.4)]"
          title={TRANSITION_MAP[clip.transitionIn].label}
          onClick={(e) => {
            e.stopPropagation();
            const ids = Object.keys(TRANSITION_MAP) as TransitionId[];
            const next = ids[(ids.indexOf(clip.transitionIn) + 1) % ids.length];
            onTransition(next, TRANSITION_MAP[next].defaultDuration);
          }}
        >
          ◆
        </button>
      ) : null}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
        className={cn(
          "h-14 w-full overflow-hidden rounded-md bg-elevated text-left shadow-[0_0_0_1px_rgba(255,255,255,0.08)]",
          selected && "shadow-[0_0_0_2px_rgba(94,234,212,0.7)]",
        )}
      >
        {thumbnail ? (
          <img src={thumbnail} alt="" className="size-full object-cover opacity-80" />
        ) : null}
        <span className="pointer-events-none absolute bottom-1 left-2 text-[10px] font-medium text-fg">
          {name}
        </span>
      </button>
    </div>
  );
}
