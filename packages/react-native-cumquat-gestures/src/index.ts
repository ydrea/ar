export { cloneGestureConfig, gestureConfig } from './config';
export {
  applyHorizontalGesture,
  applyRubberBand,
  applyRubberBandValue,
  applyVerticalGesture,
  applyZoomCoupling,
  clamp,
  compose,
  contextToUpdateResult,
  createGestureContext,
  createGestureInput,
  finiteOr,
  getLimitExcess,
  horizontalPipeline,
  normalizeState,
  prepareContext,
  rubberBandResistance,
  snapState,
  updateHorizontal,
  updateVertical,
  validateState,
  verticalPipeline,
} from './gestureMath';
export type { RubberBandResult } from './gestureMath';
export {
  useARGestureController,
  type ARGestureControllerHandle,
  type UseARGestureControllerOptions,
} from './useARGestureController';
export type {
  GestureCallbacks,
  GestureConfig,
  GestureContext,
  GestureFeedback,
  GestureInput,
  GestureMode,
  GestureStage,
  GestureState,
  GestureTracking,
  GestureUpdate,
  GestureUpdateResult,
  LimitType,
} from './types';
