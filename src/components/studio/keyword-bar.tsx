import { Aperture, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import type { AnalyzeStage } from "@/lib/types";
import { useStudio } from "@/lib/store";
import { cn } from "@/lib/utils";

const STAGE_LABEL: Record<AnalyzeStage, string> = {
  idle: "",
  frames: "프레임 추출",
  scenes: "장면 감지",
  keywords: "키워드 매칭",
  layout: "컷 순서 결정",
  captions: "자막 작성",
  done: "완료",
  error: "실패",
};

export function KeywordBar({
  stage,
  onAnalyze,
}: {
  stage: AnalyzeStage;
  onAnalyze: () => void;
}) {
  const keywords = useStudio((s) => s.keywords);
  const setKeywords = useStudio((s) => s.setKeywords);
  const [draft, setDraft] = useState("");
  const busy = stage !== "idle" && stage !== "done" && stage !== "error";
  const progress =
    stage === "frames" ? 18 : stage === "scenes" ? 36 : stage === "keywords" ? 58 : stage === "layout" ? 76 : stage === "captions" ? 90 : stage === "done" ? 100 : 0;

  const add = (raw: string) => {
    const parts = raw
      .split(/[,，#\n]/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (!parts.length) return;
    setKeywords([...new Set([...keywords, ...parts])].slice(0, 8));
    setDraft("");
  };

  return (
    <div className="flex flex-col gap-2 border-b border-border bg-surface px-3 py-3 md:px-4">
      <div className="flex flex-wrap items-center gap-2">
        {keywords.map((k) => (
          <button
            key={k}
            type="button"
            className="inline-flex h-8 items-center gap-1 rounded-full bg-elevated px-2.5 text-xs text-fg"
            onClick={() => setKeywords(keywords.filter((x) => x !== k))}
          >
            {k}
            <X className="size-3 text-subtle" />
          </button>
        ))}
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add(draft);
            }
          }}
          placeholder="키워드 입력 후 Enter"
          className="h-9 max-w-56"
        />
        <Button onClick={onAnalyze} disabled={busy} className={cn("ml-auto")}>
          <Aperture className="size-3.5" />
          {busy ? STAGE_LABEL[stage] : "키워드로 컷 잡기"}
        </Button>
      </div>
      {busy ? (
        <div className="flex items-center gap-3">
          <Progress value={progress} />
          <span className="shrink-0 text-[11px] text-muted">{STAGE_LABEL[stage]}</span>
        </div>
      ) : null}
    </div>
  );
}
