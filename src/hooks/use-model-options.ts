import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listPublicListings } from "@/lib/listings.functions";
import { DEFAULT_MODELS } from "@/lib/default-models";
import type { Modality } from "@/lib/chat-types";
import { tasksFromModalities, type TaskId } from "@/lib/model-tasks";

export type ModelOption = {
  slug: string;
  name: string;
  tagline: string;
  inputs: Modality[];
  outputs: Modality[];
  tasks: TaskId[];
  builtIn: boolean;
};

export const builtInOptions: ModelOption[] = DEFAULT_MODELS.map((m) => ({
  slug: m.slug,
  name: m.name,
  tagline: m.tagline,
  inputs: m.vision ? ["text", "image"] : ["text"],
  outputs: m.tasks.includes("image") ? ["image", "text"] : ["text"],
  tasks: m.tasks,
  builtIn: true,
}));

/** Built-in models plus approved community listings, with derived tasks. */
export function useModelOptions() {
  const listFn = useServerFn(listPublicListings);
  const listings = useQuery({ queryKey: ["public-listings"], queryFn: () => listFn() });
  return useMemo<ModelOption[]>(
    () => [
      ...builtInOptions,
      ...(listings.data ?? []).map((m) => {
        const r = m as {
          slug: string;
          name: string;
          tagline?: string | null;
          input_modalities?: string[];
          output_modalities?: string[];
          use_cases?: string | null;
        };
        const inputs = (r.input_modalities ?? ["text"]) as Modality[];
        const outputs = (r.output_modalities ?? ["text"]) as Modality[];
        const uc = r.use_cases ?? r.tagline ?? "";
        return {
          slug: r.slug,
          name: r.name,
          tagline: uc,
          inputs,
          outputs,
          tasks: tasksFromModalities(inputs, outputs, uc),
          builtIn: false,
        };
      }),
    ],
    [listings.data],
  );
}
