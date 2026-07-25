import type { GestureConfig } from './types';

/**
 * Defaults extracted from AR Atlas Otoka's production gesture tuning.
 * Consumers can pass their own GestureConfig to every public update helper
 * and to useARGestureController.
 */
export const gestureConfig: GestureConfig = {
  distance: {
    min: 0,
    max: 135_000,
    minGap: 100,
  },
  fov: {
    min: 30,
    max: 120,
  },
  gesture: {
    rubberBandFactor: 0.3,
    rubberBandMaxResistance: 0.8,
    rubberBandLogFactor: 0.15,
    verticalPixelToMeter: 400,
    verticalPixelToZoom: 0.003,
    horizontalPixelToFov: 0.2,
    distanceSensitivity: 1,
    zoomSensitivity: 1,
    fovSensitivity: 1,
    zoomCouplingFactor: 0.5,
    springStiffness: 240,
    springDamping: 24,
    springMass: 1,
  },
};

export function cloneGestureConfig(
  source: GestureConfig = gestureConfig
): GestureConfig {
  return {
    distance: { ...source.distance },
    fov: { ...source.fov },
    gesture: { ...source.gesture },
  };
}
