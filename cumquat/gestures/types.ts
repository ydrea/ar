export type GestureMode =
  | "horizontal"
  | "adjustMin"
  | "adjustMax"
  | "symmetric"
  | "pinchFromAbove"
  | "pinchFromBelow";

export type LimitType = "min" | "max" | "zoom" | "fov";

export type GestureState = {
  minDistance: number;
  maxDistance: number;
  zoom: number;
  fov: number;
};

export type GestureInput = {
  translationX: number;
  translationY: number;
  velocityX: number;
  velocityY: number;
  scale: number;
  focalX: number;
  focalY: number;
  numberOfPointers: number;
};

export type GestureFeedback = {
  rubberBanding: boolean;
  activeLimit: LimitType | null;
  excess: number;
};

export type GestureContext = {
  state: GestureState;
  base: GestureState;
  input: GestureInput;
  feedback: GestureFeedback;
};

export type GestureTracking = {
  mode: GestureMode | null;
  base: GestureState;
  feedback: GestureFeedback;
};

export type GestureUpdate = {
  state: GestureState;
  rubberBanding: boolean;
  activeLimit: LimitType | null;
  excess: number;
};

export type GestureUpdateResult = GestureUpdate;

export type GestureCallbacks = {
  onStart?(mode: GestureMode): void;
  onUpdate?(update: GestureUpdate): void;
  onEnd?(state: GestureState): void;
};

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
    zoomCouplingFactor: number;
    springStiffness: number;
    springDamping: number;
    springMass: number;
  };
}

export type GestureStage = (
  context: GestureContext,
  config: GestureConfig,
) => GestureContext;
