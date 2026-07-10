import { AR_CONSTANTS } from "./constants";

export type GestureMode =
  | "horizontal"
  | "adjustMin"
  | "adjustMax"
  | "symmetric"
  | "pinchFromAbove"
  | "pinchFromBelow"
  | null;

export type LimitType = "min" | "max" | "zoom" | "fov";

export type GestureState = {
  minDistance: number;
  maxDistance: number;
  zoom: number;
  fov: number;
};

export type GestureTracking = {
  mode: GestureMode;
  rubberBanding: boolean;
  activeLimit: LimitType | null;
  base: GestureState;
};

export type GestureUpdate = {
  state: GestureState;
  rubberBanding: boolean;
  activeLimit: LimitType | null;
};

export type GestureCallbacks = {
  onStart?(mode: GestureMode): void;
  onUpdate?(update: GestureUpdate): void;
  onEnd?(state: GestureState): void;
};

// export GestureConfig  {};
export interface GestureConfig {
  distance: {
    min: number;
    max: number;
    minGap: number;
  };

  fov: {
    min: number;
    max: number;
  };

  gesture: {
    rubberBandFactor: number;
    rubberBandMaxResistance: number;
    rubberBandLogFactor: number;
    verticalPixelToMeter: number;
    verticalPixelToZoom: number;
    horizontalPixelToFov: number;
    distanceSensitivity: number;
    zoomSensitivity: number;
    fovSensitivity: number;
  };
}

export type GestureUpdateResult = {
  state: GestureState;
  rubberBanding: boolean;
  activeLimit: LimitType | null;
};

export type GestureInput = {
  translationX: number;
  translationY: number;
};

export type GestureContext = {
  state: GestureState;

  base: GestureState;

input: GestureInput;
  rubberBanding: boolean;
  hitLimit: LimitType | null;
};