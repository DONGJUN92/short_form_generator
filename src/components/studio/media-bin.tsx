import { Film, Plus, Trash2 } from "lucide-react";
import { useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { mediaFromFile } from "@/lib/video/load-media";
import { useStudio } from "@/lib/store";
import { formatTimecode } from "@/lib/utils";

export function MediaBin() {
  const inputRef = useRef<HTMLInputElement>(null);
  const assets = useStudio((s) => s.assets);
  const addAsset = useStudio((s) => s.addAsset);
  const removeAsset = useStudio((s) => s.removeAsset);

  const onFiles = async (files: FileList | null) => {
    if (!files) return;
    for (const file of [...files]) {
      try {
        const asset = await mediaFromFile(file);
        addAsset(asset);
        toast.success(`${asset.name} 추가됨`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "가져오기에 실패했습니다.");
      }
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between px-3 pt-3 pb-2">
        <p className="text-[11px] font-medium tracking-wide text-muted uppercase">미디어</p>
        <Button variant="ghost" size="icon-sm" onClick={() => inputRef.current?.click()} aria-label="영상 추가">
          <Plus />
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="video/*"
          multiple
          className="hidden"
          suppressHydrationWarning
          onChange={(e) => void onFiles(e.target.files)}
        />
      </div>
      <ScrollArea className="min-h-0 flex-1 px-3 pb-3">
        <div className="flex flex-col gap-2">
          {assets.map((asset) => (
            <div
              key={asset.id}
              className="flex gap-2 rounded-lg bg-elevated p-1.5 shadow-[0_0_0_1px_rgba(255,255,255,0.06)]"
            >
              <img
                src={asset.thumbnail}
                alt=""
                className="h-14 w-10 rounded-md object-cover outline outline-1 -outline-offset-1 outline-white/10"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium">{asset.name}</p>
                <p className="font-mono text-[11px] tabular-nums text-subtle">
                  {formatTimecode(asset.duration)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="삭제"
                onClick={() => removeAsset(asset.id)}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          ))}
          {!assets.length ? (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="grid h-32 place-items-center rounded-lg border border-dashed border-border text-center"
            >
              <span className="flex flex-col items-center gap-2 text-xs text-muted">
                <Film className="size-5" />
                1분 이하 영상
              </span>
            </button>
          ) : null}
        </div>
      </ScrollArea>
    </div>
  );
}
