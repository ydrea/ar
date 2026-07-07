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

export type GestureConfig = typeof AR_CONSTANTS;

// export type GestureConfig = {
//   minDistance: number;
//   maxDistance: number;
//   zoom: number;
//   fov: number;
// };

export type GestureUpdateResult = {
  state: GestureState;
  rubberBanding: boolean;
  activeLimit: LimitType | null;
};
