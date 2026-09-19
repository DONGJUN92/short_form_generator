import type {
  AnalysisResult,
  AspectId,
  Caption,
  CaptionStyleId,
  ColorGradeId,
  DubbingTake,
  MediaAsset,
  Overlay,
  TimelineClip,
  YoutubePack,
} from "@/lib/types";

export type ProjectSnapshot = {
  name: string;
  keywords: string[];
  aspect: AspectId;
  assets: MediaAsset[];
  clips: TimelineClip[];
  captions: Caption[];
  captionStyle: CaptionStyleId;
  overlays: Overlay[];
  youtubePack: YoutubePack | null;
  colorGrade: ColorGradeId;
  bgmUrl: string | null;
  bgmVolume: number;
  originalVolume: number;
  dubVolume: number;
  voiceId: string;
  analysis: AnalysisResult | null;
  usedAi: boolean;
  preferOriginal: boolean;
  dubbing?: DubbingTake | null;
};
