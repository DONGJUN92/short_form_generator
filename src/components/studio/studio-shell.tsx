import { ArrowLeft, Download } from "lucide-react";
import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { BrandMark } from "@/components/brand-mark";
import { ExportDialog } from "@/components/studio/export-dialog";
import { Inspector } from "@/components/studio/inspector";
import { KeywordBar } from "@/components/studio/keyword-bar";
import { MediaBin } from "@/components/studio/media-bin";
import { PreviewStage } from "@/components/studio/preview-stage";
import { Timeline } from "@/components/studio/timeline";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { analyzeFootage } from "@/lib/ai/analyze";
import { localAnalysis } from "@/lib/ai/local-analysis";
import { detectScenes, pickAnalysisFrames } from "@/lib/video/scene-detect";
import { loadVideoElement } from "@/lib/video/load-media";
import type { AnalyzeStage } from "@/lib/types";
import { useStudio } from "@/lib/store";

export function StudioShell() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stage, setStage] = useState<AnalyzeStage>("idle");
  const [exportOpen, setExportOpen] = useState(false);
  const name = useStudio((s) => s.name);
  const setName = useStudio((s) => s.setName);
  const assets = useStudio((s) => s.assets);
  const keywords = useStudio((s) => s.keywords);
  const applyAnalysis = useStudio((s) => s.applyAnalysis);
  const usedAi = useStudio((s) => s.usedAi);

  const runAnalyze = async () => {
    const asset = assets[0];
    if (!asset) {
      toast.error("먼저 영상을 가져오세요.");
      return;
    }
    if (!keywords.length) {
      toast.error("키워드를 한 개 이상 입력하세요.");
      return;
    }
    setStage("frames");
    try {
      const video = await loadVideoElement(asset.objectUrl);
      setStage("scenes");
      const { scenes, frames } = await detectScenes(video, asset);
      setStage("keywords");
      const picked = pickAnalysisFrames(frames, 6);
      setStage("layout");
      let analysis;
      let ai = false;
      try {
        const result = await analyzeFootage({
          data: {
            keywords,
            duration: asset.duration,
            frames: picked.map((f) => ({ time: f.time, dataUrl: f.dataUrl })),
            scenes: scenes.map((s) => ({ start: s.start, end: s.end, motion: s.motion })),
          },
        });
        analysis = result.analysis;
        ai = result.ai;
      } catch {
        analysis = localAnalysis({
          keywords,
          scenes: scenes.map((s) => ({ start: s.start, end: s.end, motion: s.motion })),
        });
      }
      setStage("captions");
      applyAnalysis(analysis, ai);
      setStage("done");
      toast.success(ai ? "키워드 기준으로 컷을 재배치했습니다." : "장면 감지 결과로 컷을 구성했습니다.");
      video.pause();
      video.removeAttribute("src");
      video.load();
    } catch (err) {
      setStage("error");
      toast.error(err instanceof Error ? err.message : "분석에 실패했습니다.");
    }
  };

  return (
    <div className="flex h-dvh flex-col bg-bg text-fg">
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border px-3 md:px-4">
        <Link to="/" className="grid size-9 place-items-center rounded-md text-muted hover:text-fg">
          <ArrowLeft className="size-4" />
        </Link>
        <BrandMark compact className="md:hidden" />
        <BrandMark className="hidden md:inline-flex" />
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-8 max-w-48 bg-transparent shadow-none md:max-w-64"
          aria-label="프로젝트 이름"
        />
        {usedAi ? (
          <span className="hidden rounded-full bg-primary/15 px-2 py-0.5 text-[11px] text-primary md:inline">
            AI 컷
          </span>
        ) : null}
        <div className="ml-auto">
          <Button size="sm" variant="solid" onClick={() => setExportOpen(true)}>
            <Download className="size-3.5" />
            내보내기
          </Button>
        </div>
      </header>
      <KeywordBar stage={stage} onAnalyze={() => void runAnalyze()} />
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <aside className="hidden w-52 shrink-0 border-r border-border lg:block">
          <MediaBin />
        </aside>
        <PreviewStage canvasRef={canvasRef} />
        <aside className="hidden w-72 shrink-0 border-l border-border xl:flex xl:flex-col">
          <Inspector />
        </aside>
      </div>
      <div className="border-t border-border lg:hidden">
        <div className="grid grid-cols-2">
          <div className="h-40 border-r border-border">
            <MediaBin />
          </div>
          <div className="h-40">
            <Inspector />
          </div>
        </div>
      </div>
      <Timeline />
      <ExportDialog open={exportOpen} onOpenChange={setExportOpen} canvasRef={canvasRef} />
    </div>
  );
}
