"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { ZOOM_DEFAULT_STEP, clampZoomStep } from "@/lib/gallery-zoom";

const STORAGE_KEY = "pifpaf-gallery-zoom";

type StepUpdate = number | ((prev: number) => number);

const GalleryZoomContext = createContext<{ step: number; setStep: (update: StepUpdate) => void } | null>(null);

export function GalleryZoomProvider({ children }: { children: React.ReactNode }) {
  const [step, setStepState] = useState(ZOOM_DEFAULT_STEP);

  useEffect(() => {
    function syncFromStorage() {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === null) return;
      const parsed = Number(stored);
      if (!Number.isNaN(parsed)) setStepState(clampZoomStep(parsed));
    }
    syncFromStorage();
  }, []);

  // Functional form so two "+" clicks in quick succession (before React has
  // re-rendered in between) both apply, instead of the second one reading the
  // same stale `step` the first one started from.
  function setStep(update: StepUpdate) {
    setStepState((prev) => {
      const next = typeof update === "function" ? update(prev) : update;
      const clamped = clampZoomStep(next);
      window.localStorage.setItem(STORAGE_KEY, String(clamped));
      return clamped;
    });
  }

  return <GalleryZoomContext.Provider value={{ step, setStep }}>{children}</GalleryZoomContext.Provider>;
}

// Every gallery on the page shares one zoom level, so the toolbar next to the
// title and every PublicGallery instance below it stay in sync without prop
// drilling through the server-rendered block tree.
export function useGalleryZoom() {
  const ctx = useContext(GalleryZoomContext);
  if (!ctx) throw new Error("useGalleryZoom must be used within GalleryZoomProvider");
  return ctx;
}
