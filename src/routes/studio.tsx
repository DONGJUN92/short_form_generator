import { createFileRoute } from "@tanstack/react-router";
import { StudioShell } from "@/components/studio/studio-shell";

export const Route = createFileRoute("/studio")({ component: StudioShell });
