import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { DUB_VOICES, synthesizeDub } from "@/lib/ai/tts";
import type { CaptionStyleId, TransitionId } from "@/lib/types";
import { TRANSITIONS, TRANSITION_MAP } from "@/lib/transitions";
import { useStudio } from "@/lib/store";
import { cn } from "@/lib/utils";

const CAPTION_STYLES: { id: CaptionStyleId; label: string }[] = [
  { id: "classic", label: "클래식" },
  { id: "boxed", label: "박스" },
  { id: "karaoke", label: "하이라이트" },
  { id: "outline", label: "아웃라인" },
  { id: "minimal", label: "미니멀" },
];

export function Inspector() {
  const clips = useStudio((s) => s.clips);
  const selectedClipId = useStudio((s) => s.selectedClipId);
  const captions = useStudio((s) => s.captions);
  const captionStyle = useStudio((s) => s.captionStyle);
  const setCaptionStyle = useStudio((s) => s.setCaptionStyle);
  const updateCaption = useStudio((s) => s.updateCaption);
  const updateClip = useStudio((s) => s.updateClip);
  const analysis = useStudio((s) => s.analysis);
  const dubbing = useStudio((s) => s.dubbing);
  const setDubbing = useStudio((s) => s.setDubbing);
  const voiceId = useStudio((s) => s.voiceId);
  const setVoiceId = useStudio((s) => s.setVoiceId);
  const originalVolume = useStudio((s) => s.originalVolume);
  const dubVolume = useStudio((s) => s.dubVolume);
  const setVolumes = useStudio((s) => s.setVolumes);
  const [busy, setBusy] = useState(false);

  const clip = clips.find((c) => c.id === selectedClipId) ?? clips[0];
  const script = useMemo(() => {
    if (analysis) {
      return analysis.scenes
        .filter((s) => s.keep)
        .sort((a, b) => a.order - b.order)
        .map((s) => s.dubbing)
        .filter(Boolean)
        .join(" ");
    }
    return captions.map((c) => c.text).join(" ");
  }, [analysis, captions]);

  const generateDub = async () => {
    if (!script.trim()) {
      toast.error("더빙할 대사가 없습니다. 먼저 키워드 분석을 실행하세요.");
      return;
    }
    setBusy(true);
    try {
      const result = await synthesizeDub({ data: { text: script, voiceId } });
      if (!result.ok) {
        fallbackSpeech(script);
        return;
      }
      const bytes = Uint8Array.from(atob(result.audio), (c) => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: result.mime });
      const audioUrl = URL.createObjectURL(blob);
      const duration = await audioDuration(audioUrl);
      if (dubbing) URL.revokeObjectURL(dubbing.audioUrl);
      setDubbing({ text: script, voiceId, audioUrl, duration });
      toast.success("더빙 트랙이 준비됐습니다.");
    } catch {
      fallbackSpeech(script);
    } finally {
      setBusy(false);
    }
  };

  const fallbackSpeech = (text: string) => {
    if (typeof speechSynthesis === "undefined") {
      toast.error("이 환경에서는 더빙을 생성할 수 없습니다.");
      return;
    }
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "ko-KR";
    speechSynthesis.speak(u);
    toast.message("브라우저 음성으로 미리 듣습니다.");
  };

  return (
    <Tabs defaultValue="cut" className="flex h-full min-h-0 flex-col">
      <TabsList className="mx-3 mt-3">
        <TabsTrigger value="cut">컷</TabsTrigger>
        <TabsTrigger value="caption">자막</TabsTrigger>
        <TabsTrigger value="dub">더빙</TabsTrigger>
        <TabsTrigger value="fx">전환</TabsTrigger>
      </TabsList>
      <TabsContent value="cut" className="min-h-0 flex-1 overflow-auto px-3 py-3">
        {clip ? (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-muted">선택한 클립 구간</p>
            <p className="font-mono text-sm tabular-nums">
              {clip.srcStart.toFixed(1)}s → {clip.srcEnd.toFixed(1)}s
            </p>
            {analysis?.hook ? (
              <p className="rounded-lg bg-elevated p-3 text-sm text-fg">{analysis.hook}</p>
            ) : (
              <p className="text-sm text-subtle">키워드 분석을 실행하면 컷 순서가 재배치됩니다.</p>
            )}
          </div>
        ) : (
          <p className="text-sm text-subtle">클립을 선택하세요.</p>
        )}
      </TabsContent>
      <TabsContent value="caption" className="min-h-0 flex-1 overflow-auto px-3 py-3">
        <Label>스타일</Label>
        <div className="mt-2 mb-4 grid grid-cols-2 gap-1.5">
          {CAPTION_STYLES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setCaptionStyle(s.id)}
              className={cn(
                "h-9 rounded-md text-xs font-medium",
                captionStyle === s.id ? "bg-primary text-primary-fg" : "bg-elevated text-muted",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-2">
          {captions.map((cap) => (
            <Textarea
              key={cap.id}
              value={cap.text}
              onChange={(e) => updateCaption(cap.id, { text: e.target.value })}
              rows={2}
            />
          ))}
          {!captions.length ? <p className="text-sm text-subtle">분석 후 자막이 채워집니다.</p> : null}
        </div>
      </TabsContent>
      <TabsContent value="dub" className="min-h-0 flex-1 overflow-auto px-3 py-3">
        <Label>보이스</Label>
        <div className="mt-2 mb-3 flex flex-col gap-1">
          {DUB_VOICES.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setVoiceId(v.id)}
              className={cn(
                "h-9 rounded-md px-3 text-left text-xs",
                voiceId === v.id ? "bg-primary text-primary-fg" : "bg-elevated text-muted",
              )}
            >
              {v.label}
            </button>
          ))}
        </div>
        <Label>원본 볼륨</Label>
        <Slider
          className="mt-2 mb-3"
          min={0}
          max={1}
          step={0.02}
          value={[originalVolume]}
          onValueChange={([v]) => setVolumes(v ?? 0, dubVolume)}
        />
        <Label>더빙 볼륨</Label>
        <Slider
          className="mt-2 mb-4"
          min={0}
          max={1}
          step={0.02}
          value={[dubVolume]}
          onValueChange={([v]) => setVolumes(originalVolume, v ?? 0)}
        />
        <Button className="w-full" onClick={() => void generateDub()} disabled={busy}>
          {busy ? "생성 중…" : dubbing ? "더빙 다시 만들기" : "더빙 생성"}
        </Button>
        <p className="mt-2 text-xs leading-relaxed text-subtle">{script || "대사가 아직 없습니다."}</p>
      </TabsContent>
      <TabsContent value="fx" className="min-h-0 flex-1 overflow-auto px-3 py-3">
        {!clip || clips.indexOf(clip) === 0 ? (
          <p className="text-sm text-subtle">두 번째 클립부터 전환을 넣을 수 있습니다.</p>
        ) : (
          <TransitionGrid
            value={clip.transitionIn}
            onChange={(id) =>
              updateClip(clip.id, {
                transitionIn: id,
                transitionDuration: TRANSITION_MAP[id].defaultDuration,
              })
            }
          />
        )}
      </TabsContent>
    </Tabs>
  );
}

function TransitionGrid({
  value,
  onChange,
}: {
  value: TransitionId;
  onChange: (id: TransitionId) => void;
}) {
  const groups = ["basic", "wipe", "motion", "fx"] as const;
  const labels = { basic: "기본", wipe: "와이프", motion: "모션", fx: "효과" };
  return (
    <div className="flex flex-col gap-4">
      {groups.map((g) => (
        <div key={g}>
          <p className="mb-2 text-[11px] font-medium tracking-wide text-muted uppercase">{labels[g]}</p>
          <div className="grid grid-cols-2 gap-1.5">
            {TRANSITIONS.filter((t) => t.group === g).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => onChange(t.id)}
                className={cn(
                  "rounded-md px-2 py-2 text-left",
                  value === t.id ? "bg-primary text-primary-fg" : "bg-elevated text-fg",
                )}
              >
                <span className="block text-xs font-medium">{t.label}</span>
                <span className={cn("block text-[10px]", value === t.id ? "opacity-80" : "text-subtle")}>
                  {t.hint}
                </span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function audioDuration(url: string): Promise<number> {
  return new Promise((resolve) => {
    const a = new Audio(url);
    a.addEventListener("loadedmetadata", () => resolve(a.duration || 0), { once: true });
    a.addEventListener("error", () => resolve(0), { once: true });
  });
}
