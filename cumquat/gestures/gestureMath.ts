// cumquat/gestures/gestureMath.ts

import { AR_CONSTANTS } from "../constants";
import type {
  GestureConfig,
  GestureContext,
  GestureInput,
  GestureStage,
  GestureState,
  GestureUpdateResult,
  LimitType,
} from "./types";

export type RubberBandResult = {
  value: number;
  rubberBanding: boolean;
  activeLimit: LimitType | null;
  excess: number;
};

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
    rubberBandLogFactor: AR_CONSTANTS.GESTURE.RUBBER_BAND_LOG_FACTOR,
    verticalPixelToMeter: AR_CONSTANTS.GESTURE.VERTICAL_PIXEL_TO_METER,
    verticalPixelToZoom: AR_CONSTANTS.GESTURE.VERTICAL_PIXEL_TO_ZOOM,
    horizontalPixelToFov: AR_CONSTANTS.GESTURE.HORIZONTAL_PIXEL_TO_FOV,
    distanceSensitivity: AR_CONSTANTS.GESTURE.DISTANCE_SENSITIVITY,
    zoomSensitivity: AR_CONSTANTS.GESTURE.ZOOM_SENSITIVITY,
    fovSensitivity: AR_CONSTANTS.GESTURE.FOV_SENSITIVITY,
    zoomCouplingFactor: AR_CONSTANTS.GESTURE.ZOOM_COUPLING_FACTOR,
    springStiffness: AR_CONSTANTS.GESTURE.SPRING_STIFFNESS,
    springDamping: AR_CONSTANTS.GESTURE.SPRING_DAMPING,
    springMass: AR_CONSTANTS.GESTURE.SPRING_MASS,
  },
};

/* -------------------------------------------------------------------------- */
/* Basic utilities                                                            */
/* -------------------------------------------------------------------------- */

export function clamp(value: number, min: number, max: number): number {
  "worklet";

  const lower = Math.min(min, max);
  const upper = Math.max(min, max);

  return Math.min(Math.max(value, lower), upper);
}

export function finiteOr(value: number, fallback: number): number {
  "worklet";

  return Number.isFinite(value) ? value : fallback;
}

export function normalizeState(state: GestureState): GestureState {
  "worklet";

  const minDistance = Math.min(state.minDistance, state.maxDistance);
  const maxDistance = Math.max(state.minDistance, state.maxDistance);

  return {
    minDistance,
    maxDistance,
    zoom: state.zoom,
    fov: state.fov,
  };
}

/**
 * Produces a finite, ordered, fully clamped state.
 *
 * Use this for external state updates and gesture-end snap-back. Do not place
 * it after applyRubberBand in a live gesture pipeline, because clamping there
 * would remove the visible rubber-band overshoot.
 */
export function validateState(
  state: GestureState,
  config: GestureConfig = gestureConfig,
): GestureState {
  "worklet";

  const distanceMin = config.distance.min;
  const distanceMax = config.distance.max;
  const minGap = Math.max(0, config.distance.minGap);

  const finiteState: GestureState = {
    minDistance: finiteOr(state.minDistance, distanceMin),
    maxDistance: finiteOr(
      state.maxDistance,
      Math.min(distanceMax, distanceMin + minGap),
    ),
    zoom: finiteOr(state.zoom, 0),
    fov: finiteOr(state.fov, config.fov.max),
  };

  const normalized = normalizeState(finiteState);

  let minDistance = clamp(
    normalized.minDistance,
    distanceMin,
    distanceMax,
  );
  let maxDistance = clamp(
    normalized.maxDistance,
    distanceMin,
    distanceMax,
  );

  if (maxDistance - minDistance < minGap) {
    if (minDistance + minGap <= distanceMax) {
      maxDistance = minDistance + minGap;
    } else {
      maxDistance = distanceMax;
      minDistance = Math.max(distanceMin, distanceMax - minGap);
    }
  }

  return {
    minDistance,
    maxDistance,
    zoom: clamp(normalized.zoom, 0, 1),
    fov: clamp(normalized.fov, config.fov.min, config.fov.max),
  };
}

export function createGestureInput(
  translationX = 0,
  translationY = 0,
  velocityX = 0,
  velocityY = 0,
  scale = 1,
  focalX = 0,
  focalY = 0,
  numberOfPointers = 2,
): GestureInput {
  "worklet";

  return {
    translationX,
    translationY,
    velocityX,
    velocityY,
    scale,
    focalX,
    focalY,
    numberOfPointers,
  };
}

export function createGestureContext(
  base: GestureState,
  input: GestureInput,
  config: GestureConfig = gestureConfig,
): GestureContext {
  "worklet";

  const validBase = validateState(base, config);

  return {
    base: validBase,
    state: { ...validBase },
    input,
    feedback: {
      rubberBanding: false,
      activeLimit: null,
      excess: 0,
    },
  };
}

/* -------------------------------------------------------------------------- */
/* Rubber band                                                                */
/* -------------------------------------------------------------------------- */

export function rubberBandResistance(
  excess: number,
  config: GestureConfig = gestureConfig,
): number {
  "worklet";

  const safeExcess = Math.max(0, finiteOr(excess, 0));
  const scale = Math.max(1, config.distance.minGap);

  return (
    1 -
    Math.min(
      config.gesture.rubberBandMaxResistance,
      Math.log10(1 + safeExcess / scale) *
        config.gesture.rubberBandLogFactor,
    )
  );
}

export function applyRubberBandValue(
  value: number,
  min: number,
  max: number,
  limit: LimitType,
  config: GestureConfig = gestureConfig,
): RubberBandResult {
  "worklet";

  const lower = Math.min(min, max);
  const upper = Math.max(min, max);

  if (value < lower) {
    const excess = lower - value;
    const resistance = rubberBandResistance(excess, config);

    return {
      value:
        lower - excess * config.gesture.rubberBandFactor * resistance,
      rubberBanding: true,
      activeLimit: limit,
      excess,
    };
  }

  if (value > upper) {
    const excess = value - upper;
    const resistance = rubberBandResistance(excess, config);

    return {
      value:
        upper + excess * config.gesture.rubberBandFactor * resistance,
      rubberBanding: true,
      activeLimit: limit,
      excess,
    };
  }

  return {
    value,
    rubberBanding: false,
    activeLimit: null,
    excess: 0,
  };
}

/* -------------------------------------------------------------------------- */
/* Pipeline                                                                   */
/* -------------------------------------------------------------------------- */

export function compose(...stages: GestureStage[]): GestureStage {
  "worklet";

  return (context: GestureContext, config: GestureConfig): GestureContext => {
    "worklet";

    let next = context;

    for (let index = 0; index < stages.length; index += 1) {
      next = stages[index](next, config);
    }

    return next;
  };
}

/** Revalidates only the pipeline input, before any overshoot is calculated. */
export const prepareContext: GestureStage = (context, config) => {
  "worklet";

  const base = validateState(context.base, config);

  return {
    ...context,
    base,
    state: { ...base },
    feedback: {
      rubberBanding: false,
      activeLimit: null,
      excess: 0,
    },
  };
};

export const applyHorizontalGesture: GestureStage = (context, config) => {
  "worklet";

  const delta =
    context.input.translationX *
    config.gesture.horizontalPixelToFov *
    config.gesture.fovSensitivity;

  return {
    ...context,
    state: {
      ...context.state,
      fov: context.base.fov + delta,
    },
  };
};

export const applyVerticalGesture: GestureStage = (context, config) => {
  "worklet";

  const delta =
    -context.input.translationY *
    config.gesture.verticalPixelToMeter *
    config.gesture.distanceSensitivity;

  return {
    ...context,
    state: {
      ...context.state,
      maxDistance: context.base.maxDistance + delta,
    },
  };
};

export const applyZoomCoupling: GestureStage = (context, config) => {
  "worklet";

  const delta =
    -context.input.translationY *
    config.gesture.verticalPixelToZoom *
    config.gesture.zoomSensitivity *
    config.gesture.zoomCouplingFactor;

  return {
    ...context,
    state: {
      ...context.state,
      zoom: context.base.zoom + delta,
    },
  };
};

/**
 * Applies limits to every state field and preserves overshoot through the
 * rubber-band equation. Distance limits take precedence over zoom and FOV if
 * more than one limit is exceeded in the same frame.
 */
export const applyRubberBand: GestureStage = (context, config) => {
  "worklet";

  const minResult = applyRubberBandValue(
    context.state.minDistance,
    config.distance.min,
    context.state.maxDistance - config.distance.minGap,
    "min",
    config,
  );

  const maxResult = applyRubberBandValue(
    context.state.maxDistance,
    minResult.value + config.distance.minGap,
    config.distance.max,
    "max",
    config,
  );

  const zoomResult = applyRubberBandValue(
    context.state.zoom,
    0,
    1,
    "zoom",
    config,
  );

  const fovResult = applyRubberBandValue(
    context.state.fov,
    config.fov.min,
    config.fov.max,
    "fov",
    config,
  );

  let activeLimit: LimitType | null = null;
  let excess = 0;

  if (minResult.rubberBanding) {
    activeLimit = "min";
    excess = minResult.excess;
  } else if (maxResult.rubberBanding) {
    activeLimit = "max";
    excess = maxResult.excess;
  } else if (zoomResult.rubberBanding) {
    activeLimit = "zoom";
    excess = zoomResult.excess;
  } else if (fovResult.rubberBanding) {
    activeLimit = "fov";
    excess = fovResult.excess;
  }

  return {
    ...context,
    state: {
      minDistance: minResult.value,
      maxDistance: maxResult.value,
      zoom: zoomResult.value,
      fov: fovResult.value,
    },
    feedback: {
      rubberBanding: activeLimit !== null,
      activeLimit,
      excess,
    },
  };
};

export const horizontalPipeline = compose(
  prepareContext,
  applyHorizontalGesture,
  applyRubberBand,
);

export const verticalPipeline = compose(
  prepareContext,
  applyVerticalGesture,
  applyZoomCoupling,
  applyRubberBand,
);

/* -------------------------------------------------------------------------- */
/* Public update helpers                                                      */
/* -------------------------------------------------------------------------- */

export function contextToUpdateResult(
  context: GestureContext,
): GestureUpdateResult {
  "worklet";

  return {
    state: context.state,
    rubberBanding: context.feedback.rubberBanding,
    activeLimit: context.feedback.activeLimit,
    excess: context.feedback.excess,
  };
}

export function updateHorizontal(
  base: GestureState,
  input: GestureInput,
  config: GestureConfig = gestureConfig,
): GestureUpdateResult {
  "worklet";

  const context = createGestureContext(base, input, config);
  return contextToUpdateResult(horizontalPipeline(context, config));
}

export function updateVertical(
  base: GestureState,
  input: GestureInput,
  config: GestureConfig = gestureConfig,
): GestureUpdateResult {
  "worklet";

  const context = createGestureContext(base, input, config);
  return contextToUpdateResult(verticalPipeline(context, config));
}

/** Final hard-clamp used when a gesture ends or external state is received. */
export function snapState(
  state: GestureState,
  config: GestureConfig = gestureConfig,
): GestureState {
  "worklet";

  return validateState(state, config);
}

export function getLimitExcess(
  state: GestureState,
  limit: LimitType,
  config: GestureConfig = gestureConfig,
): number {
  "worklet";

  switch (limit) {
    case "min":
      return Math.max(0, config.distance.min - state.minDistance);
    case "max":
      return Math.max(0, state.maxDistance - config.distance.max);
    case "zoom":
      if (state.zoom < 0) return -state.zoom;
      if (state.zoom > 1) return state.zoom - 1;
      return 0;
    case "fov":
      if (state.fov < config.fov.min) return config.fov.min - state.fov;
      if (state.fov > config.fov.max) return state.fov - config.fov.max;
      return 0;
  }
}
