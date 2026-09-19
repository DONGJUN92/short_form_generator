import { create } from "zustand";
import type {
  AnalysisResult,
  AspectId,
  Caption,
  CaptionStyleId,
  DubbingTake,
  MediaAsset,
  TimelineClip,
  TransitionId,
} from "@/lib/types";
import { TRANSITION_MAP } from "@/lib/transitions";
import { uid } from "@/lib/utils";

type StudioState = {
  name: string;
  keywords: string[];
  aspect: AspectId;
  assets: MediaAsset[];
  clips: TimelineClip[];
  captions: Caption[];
  captionStyle: CaptionStyleId;
  dubbing: DubbingTake | null;
  voiceId: string;
  originalVolume: number;
  dubVolume: number;
  playhead: number;
  playing: boolean;
  selectedClipId: string | null;
  selectedCaptionId: string | null;
  analysis: AnalysisResult | null;
  usedAi: boolean;
  setName: (name: string) => void;
  setKeywords: (keywords: string[]) => void;
  setAspect: (aspect: AspectId) => void;
  addAsset: (asset: MediaAsset) => void;
  removeAsset: (id: string) => void;
  setClips: (clips: TimelineClip[]) => void;
  updateClip: (id: string, patch: Partial<TimelineClip>) => void;
  reorderClips: (from: number, to: number) => void;
  setCaptions: (captions: Caption[]) => void;
  updateCaption: (id: string, patch: Partial<Caption>) => void;
  setCaptionStyle: (style: CaptionStyleId) => void;
  setDubbing: (take: DubbingTake | null) => void;
  setVoiceId: (id: string) => void;
  setVolumes: (original: number, dub: number) => void;
  setPlayhead: (t: number) => void;
  setPlaying: (playing: boolean) => void;
  selectClip: (id: string | null) => void;
  selectCaption: (id: string | null) => void;
  applyAnalysis: (analysis: AnalysisResult, usedAi: boolean) => void;
  resetProject: () => void;
};

function clipFromAsset(asset: MediaAsset): TimelineClip {
  return {
    id: uid("clip"),
    assetId: asset.id,
    srcStart: 0,
    srcEnd: asset.duration,
    transitionIn: "cut",
    transitionDuration: 0,
  };
}

export function timelineDuration(clips: TimelineClip[]): number {
  return clips.reduce((sum, c) => sum + Math.max(0, c.srcEnd - c.srcStart), 0);
}

export function clipAtTime(clips: TimelineClip[], time: number) {
  let acc = 0;
  for (let i = 0; i < clips.length; i++) {
    const dur = Math.max(0, clips[i].srcEnd - clips[i].srcStart);
    if (time < acc + dur || i === clips.length - 1) {
      return { index: i, clip: clips[i], local: time - acc, start: acc, duration: dur };
    }
    acc += dur;
  }
  return null;
}

export const useStudio = create<StudioState>((set, get) => ({
  name: "무제 프로젝트",
  keywords: [],
  aspect: "9:16",
  assets: [],
  clips: [],
  captions: [],
  captionStyle: "classic",
  dubbing: null,
  voiceId: "eve",
  originalVolume: 0.35,
  dubVolume: 1,
  playhead: 0,
  playing: false,
  selectedClipId: null,
  selectedCaptionId: null,
  analysis: null,
  usedAi: false,
  setName: (name) => set({ name }),
  setKeywords: (keywords) => set({ keywords }),
  setAspect: (aspect) => set({ aspect }),
  addAsset: (asset) => {
    const clips = get().clips;
    const next = clipFromAsset(asset);
    if (clips.length > 0) {
      next.transitionIn = "crossfade";
      next.transitionDuration = TRANSITION_MAP.crossfade.defaultDuration;
    }
    set({
      assets: [...get().assets, asset],
      clips: [...clips, next],
      selectedClipId: next.id,
    });
  },
  removeAsset: (id) => {
    const asset = get().assets.find((a) => a.id === id);
    if (asset) URL.revokeObjectURL(asset.objectUrl);
    const clips = get().clips.filter((c) => c.assetId !== id);
    if (clips[0]) {
      clips[0] = { ...clips[0], transitionIn: "cut", transitionDuration: 0 };
    }
    set({
      assets: get().assets.filter((a) => a.id !== id),
      clips,
      captions: get().captions,
    });
  },
  setClips: (clips) => set({ clips }),
  updateClip: (id, patch) =>
    set({
      clips: get().clips.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }),
  reorderClips: (from, to) => {
    const clips = [...get().clips];
    const [moved] = clips.splice(from, 1);
    if (!moved) return;
    clips.splice(to, 0, moved);
    if (clips[0]) clips[0] = { ...clips[0], transitionIn: "cut", transitionDuration: 0 };
    set({ clips });
  },
  setCaptions: (captions) => set({ captions }),
  updateCaption: (id, patch) =>
    set({
      captions: get().captions.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }),
  setCaptionStyle: (captionStyle) => set({ captionStyle }),
  setDubbing: (dubbing) => set({ dubbing }),
  setVoiceId: (voiceId) => set({ voiceId }),
  setVolumes: (originalVolume, dubVolume) => set({ originalVolume, dubVolume }),
  setPlayhead: (playhead) => set({ playhead }),
  setPlaying: (playing) => set({ playing }),
  selectClip: (selectedClipId) => set({ selectedClipId }),
  selectCaption: (selectedCaptionId) => set({ selectedCaptionId }),
  applyAnalysis: (analysis, usedAi) => {
    const { assets } = get();
    const asset = assets[0];
    if (!asset) {
      set({ analysis, usedAi });
      return;
    }
    const kept = analysis.scenes
      .filter((s) => s.keep)
      .sort((a, b) => a.order - b.order)
      .map((s, i) => {
        const start = Math.max(0, Math.min(asset.duration, s.start));
        const end = Math.max(start + 0.4, Math.min(asset.duration, s.end));
        return {
          id: uid("clip"),
          assetId: asset.id,
          srcStart: start,
          srcEnd: end,
          transitionIn: (i === 0 ? "cut" : s.transition) as TransitionId,
          transitionDuration:
            i === 0 ? 0 : TRANSITION_MAP[s.transition]?.defaultDuration ?? 0.4,
        };
      });
    let acc = 0;
    const captions: Caption[] = analysis.scenes
      .filter((s) => s.keep)
      .sort((a, b) => a.order - b.order)
      .map((s) => {
        const dur = Math.max(0.4, Math.min(asset.duration, s.end) - Math.max(0, s.start));
        const cap: Caption = {
          id: uid("cap"),
          start: acc,
          end: acc + dur,
          text: s.caption || s.description,
        };
        acc += dur;
        return cap;
      });
    set({
      analysis,
      usedAi,
      clips: kept.length ? kept : get().clips,
      captions,
      name: analysis.title || get().name,
      selectedClipId: kept[0]?.id ?? null,
      playhead: 0,
      playing: false,
    });
  },
  resetProject: () => {
    for (const a of get().assets) URL.revokeObjectURL(a.objectUrl);
    const take = get().dubbing;
    if (take) URL.revokeObjectURL(take.audioUrl);
    set({
      name: "무제 프로젝트",
      keywords: [],
      aspect: "9:16",
      assets: [],
      clips: [],
      captions: [],
      captionStyle: "classic",
      dubbing: null,
      voiceId: "eve",
      originalVolume: 0.35,
      dubVolume: 1,
      playhead: 0,
      playing: false,
      selectedClipId: null,
      selectedCaptionId: null,
      analysis: null,
      usedAi: false,
    });
  },
}));
