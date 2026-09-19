import { useNavigate } from "@tanstack/react-router";
import { Clapperboard, Captions, Scissors, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { mediaFromFile, mediaFromUrl } from "@/lib/video/load-media";
import { useStudio } from "@/lib/store";

const FEATURES = [
  {
    icon: Scissors,
    title: "키워드 컷",
    body: "프레임을 읽어 키워드와 맞는 장면만 남기고 순서를 다시 잡습니다.",
  },
  {
    icon: Captions,
    title: "자막 · 더빙",
    body: "컷마다 자막을 붙이고, 선택한 보이스로 내레이션을 입힙니다.",
  },
  {
    icon: Clapperboard,
    title: "전환 16종",
    body: "디졸브, 와이프, 줌, 글리치까지 컷 사이에서 바로 고릅니다.",
  },
];

export function HomePage() {
  const nav = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const addAsset = useStudio((s) => s.addAsset);
  const setKeywords = useStudio((s) => s.setKeywords);
  const resetProject = useStudio((s) => s.resetProject);
  const [keywords, setLocal] = useState("카페, 감성, 브이로그");
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);

  const ingest = async (files: FileList | File[] | null) => {
    if (!files || files.length === 0) return;
    setBusy(true);
    try {
      resetProject();
      const parsed = keywords
        .split(/[,，#\n]/)
        .map((s) => s.trim())
        .filter(Boolean);
      setKeywords(parsed);
      for (const file of [...files]) {
        addAsset(await mediaFromFile(file));
      }
      nav({ to: "/studio" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "영상을 열 수 없습니다.");
    } finally {
      setBusy(false);
    }
  };

  const openDemo = async () => {
    setBusy(true);
    try {
      resetProject();
      setKeywords(["카페", "감성", "브이로그", "하이라이트"]);
      addAsset(await mediaFromUrl("/samples/demo.mp4", "데모 릴스"));
      nav({ to: "/studio" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "데모를 열 수 없습니다.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <header className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4">
        <BrandMark />
        <Button variant="secondary" size="sm" onClick={() => void openDemo()} disabled={busy}>
          데모 열기
        </Button>
      </header>
      <main className="mx-auto grid w-full max-w-6xl gap-10 px-4 pt-8 pb-16 md:grid-cols-[1.1fr_0.9fr] md:pt-16">
        <section className="flex flex-col justify-center">
          <p className="text-xs font-medium tracking-[0.18em] text-primary uppercase">Short-form studio</p>
          <h1 className="mt-3 max-w-xl font-display text-4xl leading-[1.1] font-semibold tracking-tight md:text-5xl">
            키워드로 컷을 고르고
            <br />
            자막과 더빙까지.
          </h1>
          <p className="mt-4 max-w-md text-base leading-relaxed text-muted">
            1분 미만 숏폼을 올리면 프레임 단위로 읽고, 키워드에 맞는 순서로 재배치합니다. CapCut처럼
            타임라인에서 전환을 고르세요.
          </p>
          <div className="mt-8 flex flex-col gap-3">
            {FEATURES.map((f, i) => (
              <div
                key={f.title}
                className="flex gap-3 rounded-xl bg-surface p-3 shadow-[0_0_0_1px_rgba(255,255,255,0.06)]"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <span className="grid size-10 place-items-center rounded-lg bg-elevated text-primary">
                  <f.icon className="size-4" />
                </span>
                <div>
                  <p className="text-sm font-medium">{f.title}</p>
                  <p className="text-sm text-muted">{f.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
        <section
          className="rounded-2xl bg-surface p-3 shadow-[0_0_0_1px_rgba(255,255,255,0.06)] md:p-4"
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            void ingest(e.dataTransfer.files);
          }}
        >
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className={`grid min-h-72 w-full place-items-center rounded-xl border border-dashed px-6 py-10 text-center transition-colors duration-150 md:min-h-80 ${
              drag ? "border-primary bg-primary/10" : "border-border bg-elevated/40"
            }`}
          >
            <span className="flex flex-col items-center gap-3">
              <span className="grid size-12 place-items-center rounded-full bg-bg text-primary">
                <Upload className="size-5" />
              </span>
              <span className="font-display text-lg font-medium">숏폼 끌어다 놓기</span>
              <span className="text-sm text-muted">MP4 · MOV · WebM · 1분 이하</span>
            </span>
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="video/*"
            multiple
            className="hidden"
            suppressHydrationWarning
            onChange={(e) => void ingest(e.target.files)}
          />
          <label className="mt-4 block text-xs font-medium text-muted">키워드</label>
          <Input
            className="mt-1.5"
            value={keywords}
            onChange={(e) => setLocal(e.target.value)}
            placeholder="카페, 감성, 브이로그"
          />
          <div className="mt-4 flex gap-2">
            <Button className="flex-1" disabled={busy} onClick={() => inputRef.current?.click()}>
              영상으로 시작
            </Button>
            <Button variant="secondary" disabled={busy} onClick={() => void openDemo()}>
              샘플로 체험
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}
