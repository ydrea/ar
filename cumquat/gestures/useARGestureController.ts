// cumquat/gestures/useARGestureController.ts
import { useCallback, useMemo } from "react";
import { Gesture } from "react-native-gesture-handler";
import {
  cancelAnimation,
  runOnJS,
  type SharedValue,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import {
  clamp,
  createGestureInput,
  gestureConfig,
  snapState,
  updateHorizontal,
  updateVertical,
  validateState,
} from "./gestureMath";
import type {
  GestureCallbacks,
  GestureConfig,
  GestureMode,
  GestureState,
} from "./types";

export type UseARGestureControllerOptions = {
  initialState: GestureState;
  callbacks?: GestureCallbacks;

  /** Optional CameraView zoom SharedValue. Updated directly on the UI thread. */
  cameraZoom?: SharedValue<number>;

  /** Optional gesture tuning. Captured as a plain UI-thread shareable. */
  config?: GestureConfig;

  directionThreshold?: number;
  directionDominanceRatio?: number;
};

export type ARGestureControllerHandle = {
  gesture: ReturnType<typeof Gesture.Pan>;

  /** Validate and replace the gesture state from the JS thread. */
  setState: (nextState: GestureState) => GestureState;
};

/**
 * Two-finger pan controller.
 *
 * Horizontal movement changes FOV. Vertical movement changes max distance and
 * camera zoom. Gesture math stays on the UI thread; React receives one update
 * object per active frame.
 */
export function useARGestureController({
  initialState,
  callbacks,
  cameraZoom,
  config,
  directionThreshold = 20,
  directionDominanceRatio = 1.5,
}: UseARGestureControllerOptions): ARGestureControllerHandle {
  // Do not read the module-level gestureConfig from inside a worklet.
  // Reanimated serializes this local plain object into the UI runtime.
  const workletConfig = useMemo<GestureConfig>(() => {
    const source = config ?? gestureConfig;

    return {
      distance: { ...source.distance },
      fov: { ...source.fov },
      gesture: { ...source.gesture },
    };
  }, [config]);

  const initial = useMemo(
    () => validateState(initialState, workletConfig),
    [
      initialState.minDistance,
      initialState.maxDistance,
      initialState.zoom,
      initialState.fov,
      workletConfig,
    ],
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
    [activeMode, baseState, cameraZoom, currentState, workletConfig],
  );

  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .minPointers(2)
        .maxPointers(2)
        .activateAfterLongPress(0)
        .onStart(() => {
          "worklet";

          baseState.value = { ...currentState.value };
          activeMode.value = null;

          if (cameraZoom) {
            cancelAnimation(cameraZoom);
          }
        })
        .onUpdate((event) => {
          "worklet";

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
              activeMode.value = "horizontal";
            } else if (
              absY >= directionThreshold &&
              absY > absX * directionDominanceRatio
            ) {
              activeMode.value = "adjustMax";
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
            event.numberOfPointers ?? 2,
          );

          const next =
            activeMode.value === "horizontal"
              ? updateHorizontal(baseState.value, input, workletConfig)
              : updateVertical(baseState.value, input, workletConfig);

          currentState.value = next.state;

          // CameraView only accepts zoom in [0, 1]. Keep the gesture's raw
          // rubber-band overshoot in next.state, but clamp the native camera.
          if (cameraZoom) {
            cameraZoom.value = clamp(next.state.zoom, 0, 1);
          }

          if (onUpdate) {
            runOnJS(onUpdate)(next);
          }
        })
        .onEnd(() => {
          "worklet";

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
          "worklet";

          // Prevent cancelled gestures from leaking their mode into the next
          // interaction. The next onStart revalidates its base state.
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
    ],
  );

  return { gesture, setState };
}
