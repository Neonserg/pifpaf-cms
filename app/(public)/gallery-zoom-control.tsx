"use client";

import { ZOOM_MAX_STEP, ZOOM_MIN_STEP } from "@/lib/gallery-zoom";
import { useGalleryZoom } from "./gallery-zoom-context";

export default function GalleryZoomControl() {
  const { step, setStep } = useGalleryZoom();

  return (
    <div className="public-zoom-control" role="group" aria-label="Масштаб зображень">
      <button
        type="button"
        onClick={() => setStep((s) => s - 1)}
        disabled={step <= ZOOM_MIN_STEP}
        aria-label="Зменшити масштаб"
        title="Зменшити масштаб"
      >
        −
      </button>
      <button
        type="button"
        onClick={() => setStep((s) => s + 1)}
        disabled={step >= ZOOM_MAX_STEP}
        aria-label="Збільшити масштаб"
        title="Збільшити масштаб"
      >
        +
      </button>
    </div>
  );
}
