export const MAX_CLIP_SECONDS = 60;

export const ASPECTS = {
  "9:16": { w: 9, h: 16, label: "9:16 릴스" },
  "1:1": { w: 1, h: 1, label: "1:1 피드" },
  "16:9": { w: 16, h: 9, label: "16:9 와이드" },
} as const;

export type AspectId = keyof typeof ASPECTS;

export type CaptionStyleId = "classic" | "boxed" | "karaoke" | "minimal" | "outline";

export type TransitionId =
  | "cut"
  | "crossfade"
  | "fadeblack"
  | "fadewhite"
  | "wipe-left"
  | "wipe-right"
  | "wipe-up"
  | "wipe-down"
  | "slide-left"
  | "slide-up"
  | "zoom"
  | "zoom-out"
  | "circle"
  | "blur"
  | "glitch"
  | "spin";

export type MediaAsset = {
  id: string;
  name: string;
  duration: number;
  width: number;
  height: number;
  objectUrl: string;
  thumbnail: string;
};

export type TimelineClip = {
  id: string;
  assetId: string;
  srcStart: number;
  srcEnd: number;
  transitionIn: TransitionId;
  transitionDuration: number;
};

export type Caption = {
  id: string;
  start: number;
  end: number;
  text: string;
};

export type FrameSample = {
  time: number;
  dataUrl: string;
  motion: number;
};

export type DetectedScene = {
  start: number;
  end: number;
  motion: number;
  thumbnail: string;
  assetId: string;
};

export type AnalysisScene = {
  start: number;
  end: number;
  description: string;
  keywordsHit: string[];
  score: number;
  keep: boolean;
  order: number;
  caption: string;
  dubbing: string;
  transition: TransitionId;
};

export type AnalysisResult = {
  title: string;
  hook: string;
  language: string;
  scenes: AnalysisScene[];
  source: "ai" | "local";
};

export type DubbingTake = {
  text: string;
  voiceId: string;
  audioUrl: string;
  duration: number;
};

export type AnalyzeStage =
  | "idle"
  | "frames"
  | "scenes"
  | "keywords"
  | "layout"
  | "captions"
  | "done"
  | "error";
