import { useCallback, useMemo } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import {
  cancelAnimation,
  runOnJS,
  type SharedValue,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { cloneGestureConfig, gestureConfig } from './config';
import {
  clamp,
  createGestureInput,
  snapState,
  updateHorizontal,
  updateVertical,
  validateState,
} from './gestureMath';
import type {
  GestureCallbacks,
  GestureConfig,
  GestureMode,
  GestureState,
} from './types';

export type UseARGestureControllerOptions = {
  initialState: GestureState;
  callbacks?: GestureCallbacks;

  /** Optional CameraView zoom SharedValue, updated directly on the UI thread. */
  cameraZoom?: SharedValue<number>;

  /** Optional tuning captured as a plain UI-thread shareable object. */
  config?: GestureConfig;

  directionThreshold?: number;
  directionDominanceRatio?: number;
};

export type ARGestureControllerHandle = {
  gesture: ReturnType<typeof Gesture.Pan>;

  /** Validate and replace the gesture state from the JavaScript thread. */
  setState: (nextState: GestureState) => GestureState;
};

/**
 * Two-finger pan controller.
 *
 * Horizontal movement changes FOV. Vertical movement changes maximum distance
 * and camera zoom. All math remains worklet-safe and runs on the UI thread.
 */
export function useARGestureController({
  initialState,
  callbacks,
  cameraZoom,
  config,
  directionThreshold = 20,
  directionDominanceRatio = 1.5,
}: UseARGestureControllerOptions): ARGestureControllerHandle {
  // Never capture the module-level object directly inside a worklet.
  const workletConfig = useMemo<GestureConfig>(
    () => cloneGestureConfig(config ?? gestureConfig),
    [config]
  );

  const initial = useMemo(
    () => validateState(initialState, workletConfig),
    [
      initialState.minDistance,
      initialState.maxDistance,
      initialState.zoom,
      initialState.fov,
      workletConfig,
    ]
  );

  const currentState = useSharedValue<GestureState>(initial);
  const baseState = useSharedValue<GestureState>(initial);
  const activeMode = useSharedValue<GestureMode | null>(null);

  const onStart = callbacks?.onStart;
  const onUpdate = callbacks?.onUpdate;
  const onEnd = callbacks?.onEnd;

  const setState = useCallback(
    (nextState: GestureState): GestureState => {
      const validated = validateState(nextState, workletConfig);

      currentState.value = validated;
      baseState.value = validated;
      activeMode.value = null;

      if (cameraZoom) {
        cancelAnimation(cameraZoom);
        cameraZoom.value = validated.zoom;
      }

      return validated;
    },
    [activeMode, baseState, cameraZoom, currentState, workletConfig]
  );

  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .minPointers(2)
        .maxPointers(2)
        .activateAfterLongPress(0)
        .onStart(() => {
          'worklet';

          baseState.value = { ...currentState.value };
          activeMode.value = null;

          if (cameraZoom) {
            cancelAnimation(cameraZoom);
          }
        })
        .onUpdate((event) => {
          'worklet';

          const translationX = Number.isFinite(event.translationX)
            ? event.translationX
            : 0;
          const translationY = Number.isFinite(event.translationY)
            ? event.translationY
            : 0;

          if (activeMode.value === null) {
            const absX = Math.abs(translationX);
            const absY = Math.abs(translationY);

            if (
              absX >= directionThreshold &&
              absX > absY * directionDominanceRatio
            ) {
              activeMode.value = 'horizontal';
            } else if (
              absY >= directionThreshold &&
              absY > absX * directionDominanceRatio
            ) {
              activeMode.value = 'adjustMax';
            } else {
              return;
            }

            if (onStart) {
              runOnJS(onStart)(activeMode.value);
            }
          }

          const input = createGestureInput(
            translationX,
            translationY,
            Number.isFinite(event.velocityX) ? event.velocityX : 0,
            Number.isFinite(event.velocityY) ? event.velocityY : 0,
            1,
            0,
            0,
            event.numberOfPointers ?? 2
          );

          const next =
            activeMode.value === 'horizontal'
              ? updateHorizontal(baseState.value, input, workletConfig)
              : updateVertical(baseState.value, input, workletConfig);

          currentState.value = next.state;

          // CameraView accepts zoom only in [0, 1]. Keep the raw overshoot in
          // next.state for feedback while clamping the native camera value.
          if (cameraZoom) {
            cameraZoom.value = clamp(next.state.zoom, 0, 1);
          }

          if (onUpdate) {
            runOnJS(onUpdate)(next);
          }
        })
        .onEnd(() => {
          'worklet';

          if (activeMode.value === null) {
            return;
          }

          const finalState = snapState(currentState.value, workletConfig);

          currentState.value = finalState;
          baseState.value = finalState;
          activeMode.value = null;

          if (cameraZoom) {
            cameraZoom.value = withSpring(finalState.zoom, {
              stiffness: workletConfig.gesture.springStiffness,
              damping: workletConfig.gesture.springDamping,
              mass: workletConfig.gesture.springMass,
            });
          }

          if (onEnd) {
            runOnJS(onEnd)(finalState);
          }
        })
        .onFinalize(() => {
          'worklet';
          activeMode.value = null;
        }),
    [
      activeMode,
      baseState,
      cameraZoom,
      currentState,
      directionDominanceRatio,
      directionThreshold,
      onEnd,
      onStart,
      onUpdate,
      workletConfig,
    ]
  );

  return { gesture, setState };
}
