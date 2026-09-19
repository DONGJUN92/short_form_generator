export const DUB_VOICES = [
  { id: "F3", label: "서연 · 내레이션" },
  { id: "F2", label: "하늘 · 밝은 톤" },
  { id: "F5", label: "수아 · 또렷함" },
  { id: "F1", label: "지민 · 차분함" },
  { id: "F4", label: "민지 · 부드러움" },
  { id: "M1", label: "도윤 · 내레이션" },
  { id: "M3", label: "현우 · 신뢰감" },
  { id: "M2", label: "준호 · 낮은 톤" },
  { id: "M4", label: "민재 · 또렷함" },
  { id: "M5", label: "시우 · 부드러움" },
] as const;

export type VoiceId = (typeof DUB_VOICES)[number]["id"];

export const DEFAULT_VOICE: VoiceId = "F3";

const VOICE_SET = new Set<string>(DUB_VOICES.map((v) => v.id));

export function asVoiceId(id: string): VoiceId {
  return VOICE_SET.has(id) ? (id as VoiceId) : DEFAULT_VOICE;
}
