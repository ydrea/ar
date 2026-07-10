// cumquat/gestures/gestureMath.ts

import { AR_CONSTANTS } from "./constants";
import type { GestureState, GestureConfig, LimitType } from "./types";

export interface RubberBandResult {
  value: number;
  rubberBanding: boolean;
  hitLimit: LimitType | null;
}

export interface GestureUpdateResult {
  state: GestureState;
  rubberBanding: boolean;
  hitLimit: LimitType | null;
}

export const gestureConfig: GestureConfig = {
  distance: {
    min: AR_CONSTANTS.DISTANCE.MIN,
    max: AR_CONSTANTS.DISTANCE.MAX,
    minGap: AR_CONSTANTS.GESTURE.MIN_DISTANCE_GAP,
  },

  fov: {
    min: AR_CONSTANTS.FOV.MIN,
    max: AR_CONSTANTS.FOV.MAX,
  },

  gesture: {
    rubberBandFactor: AR_CONSTANTS.GESTURE.RUBBER_BAND_FACTOR,
    rubberBandMaxResistance:
      AR_CONSTANTS.GESTURE.RUBBER_BAND_MAX_RESISTANCE,
    rubberBandLogFactor:
      AR_CONSTANTS.GESTURE.RUBBER_BAND_LOG_FACTOR,

    verticalPixelToMeter:
      AR_CONSTANTS.GESTURE.VERTICAL_PIXEL_TO_METER,

    verticalPixelToZoom:
      AR_CONSTANTS.GESTURE.VERTICAL_PIXEL_TO_ZOOM,

    horizontalPixelToFov:
      AR_CONSTANTS.GESTURE.HORIZONTAL_PIXEL_TO_FOV,

    distanceSensitivity:
      AR_CONSTANTS.GESTURE.DISTANCE_SENSITIVITY,

    zoomSensitivity:
      AR_CONSTANTS.GESTURE.ZOOM_SENSITIVITY,

    fovSensitivity:
      AR_CONSTANTS.GESTURE.FOV_SENSITIVITY,
  },
};


/* --------------------------------------------------------- */
/* BASIC UTILITIES                                            */
/* --------------------------------------------------------- */

export function clamp(value: number, min: number, max: number): number {
  "worklet";

  return Math.min(Math.max(value, min), max);
}

export function normalizeState(state: GestureState): GestureState {
  "worklet";

  let min = Math.min(state.minDistance, state.maxDistance);
  let max = Math.max(state.minDistance, state.maxDistance);

  return {
    ...state,
    minDistance: min,
    maxDistance: max,
  };
}

export function validateState(state: GestureState): GestureState {
  "worklet";

  let s = normalizeState(state);

  s.minDistance = clamp(
    s.minDistance,
    AR_CONSTANTS.DISTANCE.MIN,
    AR_CONSTANTS.DISTANCE.MAX,
  );

  s.maxDistance = clamp(
    s.maxDistance,
    AR_CONSTANTS.DISTANCE.MIN,
    AR_CONSTANTS.DISTANCE.MAX,
  );

  if (s.maxDistance < s.minDistance + 100) {
    s.maxDistance = s.minDistance + 100;
  }

  s.zoom = clamp(s.zoom, 0, 1);

  s.fov = clamp(s.fov, AR_CONSTANTS.FOV.MIN, AR_CONSTANTS.FOV.MAX);

  return s;
}

/* --------------------------------------------------------- */
/* RUBBER BAND                                                 */
/* --------------------------------------------------------- */

export function rubberBandResistance(excess: number): number {
  "worklet";

  return (
    1 -
    Math.min(
      AR_CONSTANTS.GESTURE.RUBBER_BAND_MAX_RESISTANCE,
      Math.log10(1 + excess / 100) *
        AR_CONSTANTS.GESTURE.RUBBER_BAND_LOG_FACTOR,
    )
  );
}

// const resistance = rubberBandResistance(excess);
/* --------------------------------------------------------- */
/* HORIZONTAL PINCH                                            */
/* --------------------------------------------------------- */

export function updateHorizontal(
  base: GestureState,
  translationX: number,
): GestureUpdateResult {
  "worklet";

  const rawFov = base.fov + translationX * HORIZONTAL_PIXEL_TO_FOV;

  const result = rubberBandResistance(
    rawFov,
    AR_CONSTANTS.FOV.MIN,
    AR_CONSTANTS.FOV.MAX,
    "fov",
  );

  return {
    state: {
      ...base,
      fov: result.value,
    },

    rubberBanding: result.rubberBanding,

    hitLimit: result.hitLimit,
  };
}

/* --------------------------------------------------------- */
/* VERTICAL PINCH                                              */
/* --------------------------------------------------------- */

export function updateVertical(
  base: GestureState,
  translationY: number,
  config: any,
): GestureUpdateResult {
  "worklet";

  const delta = -translationY;

  const maxResult = rubberBand(
    base.maxDistance + delta * VERTICAL_PIXEL_TO_METER,
    base.minDistance + 100,
    AR_CONSTANTS.DISTANCE.MAX,
    "max",
  );

  const zoomResult = rubberBand(
    base.zoom + delta * VERTICAL_PIXEL_TO_ZOOM * 0.5,
    0,
    1,
    "zoom",
  );

  return {
    state: {
      ...base,
      maxDistance: maxResult.value,
      zoom: zoomResult.value,
    },

    rubberBanding: maxResult.rubberBanding || zoomResult.rubberBanding,

    hitLimit: maxResult.hitLimit ?? zoomResult.hitLimit,
  };
}

/* --------------------------------------------------------- */
/* SNAP BACK                                                   */
/* --------------------------------------------------------- */

export function snapState(state: GestureState): GestureState {
  "worklet";

  return validateState(state);
}
