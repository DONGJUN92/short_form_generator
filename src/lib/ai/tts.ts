import { createServerFn } from "@tanstack/react-start";

const VOICES = ["eve", "luna", "orion", "helix", "ara"] as const;
export type VoiceId = (typeof VOICES)[number];

export const DUB_VOICES: { id: VoiceId; label: string }[] = [
  { id: "eve", label: "Eve · 내레이션" },
  { id: "luna", label: "Luna · 밝은 톤" },
  { id: "orion", label: "Orion · 낮은 톤" },
  { id: "helix", label: "Helix · 또렷함" },
  { id: "ara", label: "Ara · 부드러움" },
];

export const synthesizeDub = createServerFn({ method: "POST" })
  .validator((input: { text: string; voiceId: string }) => ({
    text: input.text.slice(0, 420),
    voiceId: VOICES.includes(input.voiceId as VoiceId) ? input.voiceId : "eve",
  }))
  .handler(async ({ data }) => {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      return { ok: false as const, error: "unavailable" };
    }
    if (!data.text.trim()) {
      return { ok: false as const, error: "empty" };
    }
    try {
      const res = await fetch("https://api.x.ai/v1/tts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          text: data.text.trim(),
          voice_id: data.voiceId,
          language: "ko",
        }),
      });
      if (!res.ok) {
        return { ok: false as const, error: `tts ${res.status}` };
      }
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.byteLength > 1_800_000) {
        return { ok: false as const, error: "too-large" };
      }
      const mime = res.headers.get("content-type") || "audio/mpeg";
      return {
        ok: true as const,
        mime,
        audio: buf.toString("base64"),
      };
    } catch {
      return { ok: false as const, error: "network" };
    }
  });
