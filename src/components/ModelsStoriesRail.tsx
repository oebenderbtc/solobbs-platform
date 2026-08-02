"use client";

import { useState } from "react";
import { StoryRing, StoryViewer, type StoryItem } from "@/components/StoryViewer";

export type ModelStoryGroup = {
  id: string;
  name: string;
  referralCode: string;
  avatarUrl: string | null;
  stories: StoryItem[];
};

export function ModelsStoriesRail({
  groups,
  title,
}: {
  groups: ModelStoryGroup[];
  title: string;
}) {
  const [active, setActive] = useState<number | null>(null);

  if (groups.length === 0) return null;

  const current = active != null ? groups[active] : null;

  function openNextModel() {
    if (active == null) return;
    if (active >= groups.length - 1) {
      setActive(null);
      return;
    }
    setActive(active + 1);
  }

  return (
    <>
      <section className="mb-8">
        <p className="mb-3 text-[11px] uppercase tracking-[0.22em] text-blush">
          {title}
        </p>
        <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {groups.map((g, i) => (
            <div key={g.id} className="w-[72px] shrink-0">
              <StoryRing
                hasStories
                avatarUrl={g.avatarUrl}
                name={g.name}
                label={g.name.split(" ")[0]}
                onClick={() => setActive(i)}
              />
            </div>
          ))}
        </div>
      </section>

      {current && (
        <StoryViewer
          key={current.id}
          stories={current.stories}
          modelName={current.name}
          onClose={() => setActive(null)}
          onFinished={openNextModel}
        />
      )}
    </>
  );
}
