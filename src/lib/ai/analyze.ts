import { createServerFn } from "@tanstack/react-start";
import type { AnalysisResult, AnalysisScene, TransitionId } from "@/lib/types";
import { localAnalysis } from "@/lib/ai/local-analysis";

const TRANSITION_IDS: TransitionId[] = [
  "cut",
  "crossfade",
  "fadeblack",
  "fadewhite",
  "wipe-left",
  "wipe-right",
  "wipe-up",
  "wipe-down",
  "slide-left",
  "slide-up",
  "zoom",
  "zoom-out",
  "circle",
  "blur",
  "glitch",
  "spin",
];

type FrameIn = { time: number; dataUrl: string };
type SceneIn = { start: number; end: number; motion: number };

type AnalyzeInput = {
  keywords: string[];
  duration: number;
  frames: FrameIn[];
  scenes: SceneIn[];
};

function asTransition(value: unknown, fallback: TransitionId): TransitionId {
  return typeof value === "string" && (TRANSITION_IDS as string[]).includes(value)
    ? (value as TransitionId)
    : fallback;
}

function parseAnalysis(raw: string, fallback: AnalysisResult): AnalysisResult {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return fallback;
  try {
    const json = JSON.parse(raw.slice(start, end + 1)) as Partial<AnalysisResult>;
    if (!Array.isArray(json.scenes) || json.scenes.length === 0) return fallback;
    const scenes: AnalysisScene[] = json.scenes.map((s, i) => ({
      start: Number(s.start) || 0,
      end: Number(s.end) || 0,
      description: String(s.description ?? ""),
      keywordsHit: Array.isArray(s.keywordsHit) ? s.keywordsHit.map(String) : [],
      score: Number(s.score) || 0,
      keep: s.keep !== false,
      order: Number.isFinite(Number(s.order)) ? Number(s.order) : i,
      caption: String(s.caption ?? "").slice(0, 48),
      dubbing: String(s.dubbing ?? "").slice(0, 80),
      transition: asTransition(s.transition, i === 0 ? "cut" : "crossfade"),
    }));
    return {
      title: String(json.title ?? fallback.title).slice(0, 48),
      hook: String(json.hook ?? fallback.hook).slice(0, 80),
      language: String(json.language ?? "ko"),
      scenes,
      source: "ai",
    };
  } catch {
    return fallback;
  }
}

export const analyzeFootage = createServerFn({ method: "POST" })
  .validator((input: AnalyzeInput) => ({
    keywords: input.keywords.slice(0, 8).map((k) => k.slice(0, 24)),
    duration: Math.min(60, Math.max(0, input.duration)),
    frames: input.frames.slice(0, 6).map((f) => ({
      time: f.time,
      dataUrl: f.dataUrl.slice(0, 180_000),
    })),
    scenes: input.scenes.slice(0, 12).map((s) => ({
      start: s.start,
      end: s.end,
      motion: s.motion,
    })),
  }))
  .handler(async ({ data }) => {
    const fallback = localAnalysis(data);
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      return { ok: true as const, analysis: fallback, ai: false };
    }

    const content: Array<Record<string, unknown>> = [
      {
        type: "text",
        text: `당신은 숏폼 영상 편집자입니다. 1분 미만 클립의 프레임과 장면 구간, 키워드를 보고 컷 순서를 결정하세요.

키워드: ${data.keywords.join(", ") || "(없음)"}
총 길이: ${data.duration.toFixed(2)}초
장면 후보: ${JSON.stringify(data.scenes)}

규칙:
- 키워드와 시각적으로 맞는 장면을 앞에 두고, 약한 장면은 keep=false.
- 자막은 한국어 8~18자, 더빙은 한 장면당 한 문장.
- transition은 다음 중 하나: ${TRANSITION_IDS.join(", ")}
- JSON만 출력.

형식:
{"title":"","hook":"","language":"ko","scenes":[{"start":0,"end":2.4,"description":"","keywordsHit":[],"score":0.8,"keep":true,"order":0,"caption":"","dubbing":"","transition":"crossfade"}]}`,
      },
    ];

    for (const frame of data.frames) {
      content.push({
        type: "image_url",
        image_url: { url: frame.dataUrl, detail: "low" },
      });
      content.push({
        type: "text",
        text: `프레임 t=${frame.time.toFixed(2)}s`,
      });
    }

    try {
      const res = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "grok-4.5",
          max_tokens: 900,
          temperature: 0.4,
          messages: [{ role: "user", content }],
        }),
      });
      if (!res.ok) {
        return { ok: true as const, analysis: fallback, ai: false };
      }
      const body = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const text = body.choices?.[0]?.message?.content ?? "";
      const analysis = parseAnalysis(text, fallback);
      return { ok: true as const, analysis, ai: analysis.source === "ai" };
    } catch {
      return { ok: true as const, analysis: fallback, ai: false };
    }
  });
