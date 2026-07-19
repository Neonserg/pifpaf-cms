// Gallery thumbnail zoom — every tunable number lives here so the whole
// feature can be retuned by editing this file alone.

/** Size change per step, as a fraction of the base (unzoomed) size. */
export const ZOOM_STEP_PERCENT = 0.25;

/** How many steps "-" can go below the base size. */
export const ZOOM_MIN_STEP = -2;

/** How many steps "+" can go above the base size. */
export const ZOOM_MAX_STEP = 4;

/** The step that matches today's on-screen thumbnail size (no zoom applied). */
export const ZOOM_DEFAULT_STEP = 0;

/**
 * How many steps *above* the base we pre-generate a thumbnail at. Every zoom
 * level — including ones past this point — is then just a CSS resize of that
 * one loaded image, so zooming never triggers a new image request. Steps
 * beyond this are upscaled slightly past native resolution; that tradeoff is
 * intentional (one cached file per layout instead of one per zoom level).
 */
export const THUMB_GENERATION_STEP = 2;

/** Multiplier for a given step relative to the base (unzoomed) size. */
export function zoomScale(step: number): number {
  return 1 + step * ZOOM_STEP_PERCENT;
}

export function clampZoomStep(step: number): number {
  return Math.min(ZOOM_MAX_STEP, Math.max(ZOOM_MIN_STEP, step));
}
