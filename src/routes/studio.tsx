import { createFileRoute } from "@tanstack/react-router";
import { StudioShell } from "@/components/studio/studio-shell";

export type StudioSearch = {
  p?: string;
};

export const Route = createFileRoute("/studio")({
  validateSearch: (search: Record<string, unknown>): StudioSearch => ({
    p: typeof search.p === "string" ? search.p : undefined,
  }),
  component: StudioPage,
});

function StudioPage() {
  const { p } = Route.useSearch();
  return <StudioShell featured={p} />;
}
