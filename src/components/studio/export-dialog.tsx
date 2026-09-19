import { useState, type RefObject } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { combineStreams, downloadBlob, pickRecorderMime } from "@/lib/video/export";
import { timelineDuration, useStudio } from "@/lib/store";

export function ExportDialog({
  open,
  onOpenChange,
  canvasRef,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canvasRef: RefObject<HTMLCanvasElement | null>;
}) {
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const name = useStudio((s) => s.name);
  const clips = useStudio((s) => s.clips);
  const setPlaying = useStudio((s) => s.setPlaying);
  const setPlayhead = useStudio((s) => s.setPlayhead);

  const run = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !clips.length) {
      toast.error("내보낼 타임라인이 없습니다.");
      return;
    }
    setBusy(true);
    setProgress(4);
    setPlayhead(0);
    setPlaying(true);
    const mime = pickRecorderMime();
    const stream = canvas.captureStream(30);
    const recorder = new MediaRecorder(combineStreams(stream, null), { mimeType: mime });
    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size) chunks.push(e.data);
    };
    const total = timelineDuration(clips);
    recorder.start(200);
    const started = performance.now();
    await new Promise<void>((resolve) => {
      const id = window.setInterval(() => {
        const t = (performance.now() - started) / 1000;
        setProgress(Math.min(96, (t / Math.max(0.1, total)) * 100));
        if (t >= total + 0.25) {
          window.clearInterval(id);
          resolve();
        }
      }, 120);
    });
    setPlaying(false);
    await new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
      recorder.stop();
    });
    const blob = new Blob(chunks, { type: mime });
    downloadBlob(blob, `${name || "klipo"}.webm`);
    setProgress(100);
    setBusy(false);
    toast.success("영상을 저장했습니다.");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>내보내기</DialogTitle>
        <p className="mt-2 text-sm text-muted">
          미리보기 캔버스를 그대로 녹화합니다. 자막과 전환이 포함되며 WebM으로 저장됩니다.
        </p>
        {busy ? <Progress className="mt-4" value={progress} /> : null}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={busy}>
            닫기
          </Button>
          <Button onClick={() => void run()} disabled={busy}>
            {busy ? "렌더 중…" : "렌더 시작"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
