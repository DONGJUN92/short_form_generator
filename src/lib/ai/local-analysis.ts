import type { AnalysisResult, TransitionId } from "@/lib/types";

type SceneIn = { start: number; end: number; motion: number };

export function localAnalysis(input: {
  keywords: string[];
  scenes: SceneIn[];
}): AnalysisResult {
  const keywords = input.keywords.filter(Boolean);
  const scenes = [...input.scenes];
  scenes.sort((a, b) => b.motion - a.motion);
  const ranked = input.scenes.map((scene, i) => {
    const motionRank = scenes.indexOf(scene);
    const kw = keywords[i % Math.max(1, keywords.length)] ?? "";
    const score = 0.45 + (1 - motionRank / Math.max(1, scenes.length)) * 0.5;
    const keep = input.scenes.length <= 3 ? true : score > 0.52;
    return {
      start: scene.start,
      end: scene.end,
      description: kw ? `${kw} 장면` : `장면 ${i + 1}`,
      keywordsHit: kw ? [kw] : [],
      score,
      keep,
      order: motionRank,
      caption: kw || `컷 ${i + 1}`,
      dubbing: kw ? `${kw}, 이 순간.` : "이 장면을 보세요.",
      transition: (i === 0 ? "cut" : i % 3 === 1 ? "wipe-left" : "crossfade") as TransitionId,
    };
  });
  if (!ranked.some((s) => s.keep) && ranked[0]) ranked[0].keep = true;
  return {
    title: keywords.slice(0, 3).join(" · ") || "숏폼 컷",
    hook: keywords[0] ? `${keywords[0]}로 시작하는 한 컷.` : "첫 3초에 시선을 붙잡습니다.",
    language: "ko",
    scenes: ranked,
    source: "local",
  };
}
