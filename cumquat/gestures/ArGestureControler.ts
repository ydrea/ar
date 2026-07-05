// cumquat/gestures/ArGestureControler.ts
import { Gesture } from "react-native-gesture-handler";
import { runOnJS } from "react-native-reanimated";
import { Dimensions } from "react-native";
import { AR_CONSTANTS } from "../constants";

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get("window");

export type GestureMode =
  | "adjustMax"
  | "adjustMin"
  | "symmetric"
  | "horizontal"
  | null;
export type LimitType = "min" | "max" | "zoom" | "fov" | null;

interface GestureCallbacks {
  onMinDistanceChange: (distance: number, isRubberBanding: boolean) => void;
  onMaxDistanceChange: (distance: number, isRubberBanding: boolean) => void;
  onCameraZoomChange: (zoom: number, isRubberBanding: boolean) => void;
  onFOVChange: (fov: number, isRubberBanding: boolean) => void;
  onLimitHit: (limit: LimitType, excess: number) => void;
  onLimitRelease: (limit: LimitType) => void;
  onGestureStart: (mode: GestureMode) => void;
  onGestureUpdate: (mode: GestureMode, state: any) => void;
  onGestureEnd: (mode: GestureMode, state: any) => void;
}

// Serializable state - can be sent to UI runtime
interface GestureState {
  minDistance: number;
  maxDistance: number;
  cameraZoom: number;
  fov: number;
}

// Gesture tracking state - must be serializable
interface GestureTracking {
  startTopY: number;
  startBottomY: number;
  startLeftX: number;
  startRightX: number;
  topTouchId: number | null;
  bottomTouchId: number | null;
  leftTouchId: number | null;
  rightTouchId: number | null;
  gestureMode: GestureMode;
  movingFinger: "top" | "bottom" | "both" | null;
  baseMinDist: number;
  baseMaxDist: number;
  baseCameraZoom: number;
  baseFOV: number;
  isRubberBanding: boolean;
  activeLimit: LimitType;
}

export class ARGestureController {
  private callbacks: GestureCallbacks | null = null;

  // Current state - using plain object for serialization
  private state: GestureState = {
    minDistance: AR_CONSTANTS.DISTANCE.DEFAULT_MIN,
    maxDistance: AR_CONSTANTS.DISTANCE.DEFAULT_MAX,
    cameraZoom: 0,
    fov: AR_CONSTANTS.FOV.DEFAULT,
  };

  // Tracking state - plain object for worklet safety
  private tracking: GestureTracking = {
    startTopY: 0,
    startBottomY: 0,
    startLeftX: 0,
    startRightX: 0,
    topTouchId: null,
    bottomTouchId: null,
    leftTouchId: null,
    rightTouchId: null,
    gestureMode: null,
    movingFinger: null,
    baseMinDist: 0,
    baseMaxDist: 0,
    baseCameraZoom: 0,
    baseFOV: 0,
    isRubberBanding: false,
    activeLimit: null,
  };

  // Constants - primitive values are safe
  private readonly VERTICAL_PIXEL_TO_METER = 400;
  private readonly VERTICAL_PIXEL_TO_ZOOM = 0.003;
  private readonly HORIZONTAL_PIXEL_TO_FOV = 0.2;
  private readonly RUBBER_BAND_FACTOR = 0.3;

  // ============ CLAMP, NORMALIZE, VALIDATE ============

  private clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }

  private normalizeState(
    min: number,
    max: number,
    zoom: number,
    fov: number,
  ): GestureState {
    const normalizedMin = Math.min(min, max);
    const normalizedMax = Math.max(min, max);

    return {
      minDistance: normalizedMin,
      maxDistance: normalizedMax,
      cameraZoom: zoom,
      fov: fov,
    };
  }

  private validateState(
    min: number,
    max: number,
    zoom: number,
    fov: number,
  ): GestureState {
    const safeMin =
      isNaN(min) || !isFinite(min) ? AR_CONSTANTS.DISTANCE.DEFAULT_MIN : min;
    const safeMax =
      isNaN(max) || !isFinite(max) ? AR_CONSTANTS.DISTANCE.DEFAULT_MAX : max;
    const safeZoom = isNaN(zoom) || !isFinite(zoom) ? 0 : zoom;
    const safeFov =
      isNaN(fov) || !isFinite(fov) ? AR_CONSTANTS.FOV.DEFAULT : fov;

    const normalized = this.normalizeState(safeMin, safeMax, safeZoom, safeFov);

    const clampedMin = this.clamp(
      normalized.minDistance,
      AR_CONSTANTS.DISTANCE.MIN,
      AR_CONSTANTS.DISTANCE.MAX,
    );

    const clampedMax = this.clamp(
      normalized.maxDistance,
      AR_CONSTANTS.DISTANCE.MIN,
      AR_CONSTANTS.DISTANCE.MAX,
    );

    const clampedZoom = this.clamp(normalized.cameraZoom, 0, 1);
    const clampedFov = this.clamp(
      normalized.fov,
      AR_CONSTANTS.FOV.MIN,
      AR_CONSTANTS.FOV.MAX,
    );

    let finalMin = Math.min(clampedMin, clampedMax - 100);
    let finalMax = Math.max(clampedMin + 100, clampedMax);

    finalMin = Math.max(AR_CONSTANTS.DISTANCE.MIN, finalMin);
    finalMax = Math.min(AR_CONSTANTS.DISTANCE.MAX, finalMax);

    return {
      minDistance: finalMin,
      maxDistance: finalMax,
      cameraZoom: clampedZoom,
      fov: clampedFov,
    };
  }

  updateState(min: number, max: number, zoom: number, fov: number) {
    const validated = this.validateState(min, max, zoom, fov);
    this.state = validated;
  }

  getState() {
    return { ...this.state };
  }

  getMinDistance(): number {
    return this.clamp(
      this.state.minDistance,
      AR_CONSTANTS.DISTANCE.MIN,
      this.state.maxDistance - 100,
    );
  }

  getMaxDistance(): number {
    return this.clamp(
      this.state.maxDistance,
      this.state.minDistance + 100,
      AR_CONSTANTS.DISTANCE.MAX,
    );
  }

  getZoom(): number {
    return this.clamp(this.state.cameraZoom, 0, 1);
  }

  getFOV(): number {
    return this.clamp(
      this.state.fov,
      AR_CONSTANTS.FOV.MIN,
      AR_CONSTANTS.FOV.MAX,
    );
  }

  setCallbacks(callbacks: GestureCallbacks) {
    this.callbacks = callbacks;
  }

  private checkLimitsAndApplyRubberBand(
    value: number,
    min: number,
    max: number,
    limit: LimitType,
    state: GestureState,
  ): {
    newValue: number;
    isRubberBanding: boolean;
    hitLimit: LimitType | null;
  } {
    let newValue = value;
    let isRubberBanding = false;
    let hitLimit: LimitType | null = null;

    if (value < min) {
      isRubberBanding = true;
      hitLimit = limit;
      const excess = min - value;
      const resistance = 1 - Math.min(0.8, Math.log10(1 + excess / 100) * 0.15);
      newValue = min - excess * this.RUBBER_BAND_FACTOR * resistance;
    } else if (value > max) {
      isRubberBanding = true;
      hitLimit = limit;
      const excess = value - max;
      const resistance = 1 - Math.min(0.8, Math.log10(1 + excess / 100) * 0.15);
      newValue = max + excess * this.RUBBER_BAND_FACTOR * resistance;
    }

    return { newValue, isRubberBanding, hitLimit };
  }

  private getExcessForLimit(limit: LimitType, state: GestureState): number {
    switch (limit) {
      case "min":
        return Math.max(0, AR_CONSTANTS.DISTANCE.MIN - state.minDistance);
      case "max":
        return Math.max(0, state.maxDistance - AR_CONSTANTS.DISTANCE.MAX);
      case "zoom":
        return Math.max(
          0,
          Math.abs(state.cameraZoom - (state.cameraZoom > 1 ? 1 : 0)),
        );
      case "fov":
        if (state.fov < AR_CONSTANTS.FOV.MIN)
          return AR_CONSTANTS.FOV.MIN - state.fov;
        if (state.fov > AR_CONSTANTS.FOV.MAX)
          return state.fov - AR_CONSTANTS.FOV.MAX;
        return 0;
      default:
        return 0;
    }
  }

  createGesture() {
    // Store references to primitive values and callbacks
    const callbacks = this.callbacks;
    const constants = {
      FOV_MIN: AR_CONSTANTS.FOV.MIN,
      FOV_MAX: AR_CONSTANTS.FOV.MAX,
      DISTANCE_MIN: AR_CONSTANTS.DISTANCE.MIN,
      DISTANCE_MAX: AR_CONSTANTS.DISTANCE.MAX,
      VERTICAL_PIXEL_TO_METER: this.VERTICAL_PIXEL_TO_METER,
      VERTICAL_PIXEL_TO_ZOOM: this.VERTICAL_PIXEL_TO_ZOOM,
      HORIZONTAL_PIXEL_TO_FOV: this.HORIZONTAL_PIXEL_TO_FOV,
      RUBBER_BAND_FACTOR: this.RUBBER_BAND_FACTOR,
    };

    // Create local copies of state and tracking
    let state = { ...this.state };
    let tracking = { ...this.tracking };

    // Helper functions that work with plain objects
    const checkLimits = (
      value: number,
      min: number,
      max: number,
      limit: LimitType,
    ) => {
      let newValue = value;
      let isRubberBanding = false;
      let hitLimit: LimitType | null = null;

      if (value < min) {
        isRubberBanding = true;
        hitLimit = limit;
        const excess = min - value;
        const resistance =
          1 - Math.min(0.8, Math.log10(1 + excess / 100) * 0.15);
        newValue = min - excess * constants.RUBBER_BAND_FACTOR * resistance;
      } else if (value > max) {
        isRubberBanding = true;
        hitLimit = limit;
        const excess = value - max;
        const resistance =
          1 - Math.min(0.8, Math.log10(1 + excess / 100) * 0.15);
        newValue = max + excess * constants.RUBBER_BAND_FACTOR * resistance;
      }

      return { newValue, isRubberBanding, hitLimit };
    };

    const getExcess = (limit: LimitType) => {
      switch (limit) {
        case "min":
          return Math.max(0, constants.DISTANCE_MIN - state.minDistance);
        case "max":
          return Math.max(0, state.maxDistance - constants.DISTANCE_MAX);
        case "zoom":
          return Math.max(
            0,
            Math.abs(state.cameraZoom - (state.cameraZoom > 1 ? 1 : 0)),
          );
        case "fov":
          if (state.fov < constants.FOV_MIN)
            return constants.FOV_MIN - state.fov;
          if (state.fov > constants.FOV_MAX)
            return state.fov - constants.FOV_MAX;
          return 0;
        default:
          return 0;
      }
    };

    return Gesture.Pan()
      .minPointers(2)
      .maxPointers(2)
      .activateAfterLongPress(0)
      .onTouchesDown((event) => {
        if (event.allTouches.length !== 2) return;

        const [touch1, touch2] = event.allTouches;

        const deltaX = Math.abs(touch1.x - touch2.x);
        const deltaY = Math.abs(touch1.y - touch2.y);

        if (deltaX > deltaY * 1.5) {
          tracking.gestureMode = "horizontal";

          if (touch1.x < touch2.x) {
            tracking.startLeftX = touch1.x;
            tracking.leftTouchId = touch1.id;
            tracking.startRightX = touch2.x;
            tracking.rightTouchId = touch2.id;
          } else {
            tracking.startLeftX = touch2.x;
            tracking.leftTouchId = touch2.id;
            tracking.startRightX = touch1.x;
            tracking.rightTouchId = touch1.id;
          }

          tracking.baseFOV = state.fov;
          if (callbacks) {
            runOnJS(callbacks.onGestureStart.bind(callbacks))("horizontal");
          }
          if (__DEV__) console.log(`🎯 Horizontal pinch - FOV control`);
        } else {
          if (touch1.y < touch2.y) {
            tracking.startTopY = touch1.y;
            tracking.topTouchId = touch1.id;
            tracking.startBottomY = touch2.y;
            tracking.bottomTouchId = touch2.id;
          } else {
            tracking.startTopY = touch2.y;
            tracking.topTouchId = touch2.id;
            tracking.startBottomY = touch1.y;
            tracking.bottomTouchId = touch1.id;
          }

          tracking.baseMinDist = state.minDistance;
          tracking.baseMaxDist = state.maxDistance;
          tracking.baseCameraZoom = state.cameraZoom;
          tracking.gestureMode = null;
          tracking.movingFinger = null;

          if (__DEV__) console.log(`🎯 Vertical pinch started`);
        }

        tracking.isRubberBanding = false;
        tracking.activeLimit = null;
      })
      .onTouchesMove((event) => {
        if (event.allTouches.length !== 2) return;

        if (tracking.gestureMode === "horizontal") {
          const leftTouch = event.allTouches.find(
            (t) => t.id === tracking.leftTouchId,
          );
          const rightTouch = event.allTouches.find(
            (t) => t.id === tracking.rightTouchId,
          );

          if (!leftTouch || !rightTouch) return;

          const leftDeltaX = leftTouch.x - tracking.startLeftX;
          const rightDeltaX = rightTouch.x - tracking.startRightX;

          const pinchDelta = (rightDeltaX - leftDeltaX) / 2;
          const fovDelta = pinchDelta * constants.HORIZONTAL_PIXEL_TO_FOV;

          let rawFOV = tracking.baseFOV + fovDelta;

          const { newValue, isRubberBanding, hitLimit } = checkLimits(
            rawFOV,
            constants.FOV_MIN,
            constants.FOV_MAX,
            "fov",
          );

          state.fov = newValue;
          tracking.isRubberBanding = isRubberBanding;

          if (hitLimit && !tracking.activeLimit) {
            tracking.activeLimit = hitLimit;
            const excess = Math.abs(
              state.fov -
                (state.fov < constants.FOV_MIN
                  ? constants.FOV_MIN
                  : constants.FOV_MAX),
            );
            if (callbacks) {
              runOnJS(callbacks.onLimitHit.bind(callbacks))(hitLimit, excess);
            }
          } else if (!hitLimit && tracking.activeLimit) {
            if (callbacks) {
              runOnJS(callbacks.onLimitRelease.bind(callbacks))(
                tracking.activeLimit,
              );
            }
            tracking.activeLimit = null;
          }

          if (callbacks) {
            runOnJS(callbacks.onFOVChange.bind(callbacks))(
              state.fov,
              tracking.isRubberBanding,
            );
            runOnJS(callbacks.onGestureUpdate.bind(callbacks))(
              tracking.gestureMode,
              {
                fov: state.fov,
                isRubberBanding: tracking.isRubberBanding,
              },
            );
          }
        } else {
          const topTouch = event.allTouches.find(
            (t) => t.id === tracking.topTouchId,
          );
          const bottomTouch = event.allTouches.find(
            (t) => t.id === tracking.bottomTouchId,
          );

          if (!topTouch || !bottomTouch) return;

          const topDeltaY = topTouch.y - tracking.startTopY;
          const bottomDeltaY = bottomTouch.y - tracking.startBottomY;

          const isTopMoving = Math.abs(topDeltaY) > 10;
          const isBottomMoving = Math.abs(bottomDeltaY) > 10;

          if (tracking.gestureMode === null) {
            if (isTopMoving && !isBottomMoving) {
              tracking.gestureMode = "adjustMax";
              tracking.movingFinger = "top";
              if (callbacks) {
                runOnJS(callbacks.onGestureStart.bind(callbacks))("adjustMax");
              }
              if (__DEV__)
                console.log(`🎯 Adjusting MAX distance (top finger)`);
            } else if (isBottomMoving && !isTopMoving) {
              tracking.gestureMode = "adjustMin";
              tracking.movingFinger = "bottom";
              if (callbacks) {
                runOnJS(callbacks.onGestureStart.bind(callbacks))("adjustMin");
              }
              if (__DEV__)
                console.log(`🎯 Adjusting MIN distance (bottom finger)`);
            } else if (isTopMoving && isBottomMoving) {
              tracking.gestureMode = "symmetric";
              tracking.movingFinger = "both";
              if (callbacks) {
                runOnJS(callbacks.onGestureStart.bind(callbacks))("symmetric");
              }
              if (__DEV__) console.log(`🎯 Symmetric zoom (both fingers)`);
            }
          }

          let isRubberBanding = false;
          let hitLimit: LimitType | null = null;

          if (tracking.gestureMode === "adjustMax") {
            const maxDelta = -topDeltaY;
            let rawMax =
              tracking.baseMaxDist +
              maxDelta * constants.VERTICAL_PIXEL_TO_METER;

            const maxResult = checkLimits(
              rawMax,
              state.minDistance + 1000,
              constants.DISTANCE_MAX,
              "max",
            );
            state.maxDistance = maxResult.newValue;
            isRubberBanding = maxResult.isRubberBanding;
            hitLimit = maxResult.hitLimit;

            let rawZoom =
              tracking.baseCameraZoom +
              maxDelta * constants.VERTICAL_PIXEL_TO_ZOOM * 0.5;
            const zoomResult = checkLimits(rawZoom, 0, 1, "zoom");
            state.cameraZoom = zoomResult.newValue;
            if (zoomResult.isRubberBanding) isRubberBanding = true;

            if (callbacks) {
              runOnJS(callbacks.onMaxDistanceChange.bind(callbacks))(
                state.maxDistance,
                isRubberBanding,
              );
              runOnJS(callbacks.onCameraZoomChange.bind(callbacks))(
                state.cameraZoom,
                isRubberBanding,
              );
            }
          } else if (tracking.gestureMode === "adjustMin") {
            const minDelta = -bottomDeltaY;
            let rawMin =
              tracking.baseMinDist +
              minDelta * constants.VERTICAL_PIXEL_TO_METER;

            const minResult = checkLimits(
              rawMin,
              constants.DISTANCE_MIN,
              state.maxDistance - 1000,
              "min",
            );
            state.minDistance = minResult.newValue;
            isRubberBanding = minResult.isRubberBanding;
            hitLimit = minResult.hitLimit;

            if (callbacks) {
              runOnJS(callbacks.onMinDistanceChange.bind(callbacks))(
                state.minDistance,
                isRubberBanding,
              );
            }
          } else if (tracking.gestureMode === "symmetric") {
            const avgDeltaY = (topDeltaY + bottomDeltaY) / 2;
            const zoomDelta = -avgDeltaY;

            let rawZoom =
              tracking.baseCameraZoom +
              zoomDelta * constants.VERTICAL_PIXEL_TO_ZOOM;
            const zoomResult = checkLimits(rawZoom, 0, 1, "zoom");
            state.cameraZoom = zoomResult.newValue;
            isRubberBanding = zoomResult.isRubberBanding;
            hitLimit = zoomResult.hitLimit;

            let rawMin =
              tracking.baseMinDist +
              zoomDelta * constants.VERTICAL_PIXEL_TO_METER * 0.2;
            let rawMax =
              tracking.baseMaxDist +
              zoomDelta * constants.VERTICAL_PIXEL_TO_METER * 0.3;

            const minResult = checkLimits(
              rawMin,
              constants.DISTANCE_MIN,
              state.maxDistance - 1000,
              "min",
            );
            const maxResult = checkLimits(
              rawMax,
              state.minDistance + 1000,
              constants.DISTANCE_MAX,
              "max",
            );

            state.minDistance = minResult.newValue;
            state.maxDistance = maxResult.newValue;
            if (minResult.isRubberBanding || maxResult.isRubberBanding)
              isRubberBanding = true;

            if (callbacks) {
              runOnJS(callbacks.onMinDistanceChange.bind(callbacks))(
                state.minDistance,
                isRubberBanding,
              );
              runOnJS(callbacks.onMaxDistanceChange.bind(callbacks))(
                state.maxDistance,
                isRubberBanding,
              );
              runOnJS(callbacks.onCameraZoomChange.bind(callbacks))(
                state.cameraZoom,
                isRubberBanding,
              );
            }
          }

          tracking.isRubberBanding = isRubberBanding;

          if (hitLimit && !tracking.activeLimit) {
            tracking.activeLimit = hitLimit;
            const excess = getExcess(hitLimit);
            if (callbacks) {
              runOnJS(callbacks.onLimitHit.bind(callbacks))(hitLimit, excess);
            }
          } else if (!hitLimit && tracking.activeLimit) {
            if (callbacks) {
              runOnJS(callbacks.onLimitRelease.bind(callbacks))(
                tracking.activeLimit,
              );
            }
            tracking.activeLimit = null;
          }

          if (callbacks) {
            runOnJS(callbacks.onGestureUpdate.bind(callbacks))(
              tracking.gestureMode,
              {
                min: state.minDistance,
                max: state.maxDistance,
                zoom: state.cameraZoom,
                isRubberBanding: tracking.isRubberBanding,
              },
            );
          }
        }
      })
      .onTouchesUp((event) => {
        if (tracking.gestureMode === "horizontal") {
          let finalFOV = state.fov;
          if (tracking.isRubberBanding) {
            // Validate and clamp
            finalFOV = Math.max(
              constants.FOV_MIN,
              Math.min(constants.FOV_MAX, state.fov),
            );
            state.fov = finalFOV;

            if (callbacks) {
              runOnJS(callbacks.onFOVChange.bind(callbacks))(finalFOV, false);
            }
          }

          if (__DEV__)
            console.log(`✅ Horizontal ended - FOV: ${finalFOV.toFixed(1)}°`);

          if (tracking.gestureMode && callbacks) {
            runOnJS(callbacks.onGestureEnd.bind(callbacks))(
              tracking.gestureMode,
              {
                fov: finalFOV,
              },
            );
          }
        } else {
          let finalMin = state.minDistance;
          let finalMax = state.maxDistance;
          let finalZoom = state.cameraZoom;

          if (tracking.isRubberBanding) {
            // Validate and clamp
            finalMin = Math.max(
              constants.DISTANCE_MIN,
              Math.min(state.maxDistance - 100, state.minDistance),
            );
            finalMax = Math.min(
              constants.DISTANCE_MAX,
              Math.max(state.minDistance + 100, state.maxDistance),
            );
            finalZoom = Math.max(0, Math.min(1, state.cameraZoom));

            state.minDistance = finalMin;
            state.maxDistance = finalMax;
            state.cameraZoom = finalZoom;

            if (callbacks) {
              runOnJS(callbacks.onMinDistanceChange.bind(callbacks))(
                finalMin,
                false,
              );
              runOnJS(callbacks.onMaxDistanceChange.bind(callbacks))(
                finalMax,
                false,
              );
              runOnJS(callbacks.onCameraZoomChange.bind(callbacks))(
                finalZoom,
                false,
              );
            }
          }

          if (__DEV__) {
            console.log(
              `✅ Vertical ended - Min: ${(finalMin / 1000).toFixed(1)}km, Max: ${(finalMax / 1000).toFixed(1)}km`,
            );
          }

          if (tracking.gestureMode && callbacks) {
            runOnJS(callbacks.onGestureEnd.bind(callbacks))(
              tracking.gestureMode,
              {
                min: finalMin,
                max: finalMax,
                zoom: finalZoom,
              },
            );
          }
        }

        // Reset tracking
        tracking = {
          startTopY: 0,
          startBottomY: 0,
          startLeftX: 0,
          startRightX: 0,
          topTouchId: null,
          bottomTouchId: null,
          leftTouchId: null,
          rightTouchId: null,
          gestureMode: null,
          movingFinger: null,
          baseMinDist: 0,
          baseMaxDist: 0,
          baseCameraZoom: 0,
          baseFOV: 0,
          isRubberBanding: false,
          activeLimit: null,
        };

        if (tracking.activeLimit && callbacks) {
          runOnJS(callbacks.onLimitRelease.bind(callbacks))(
            tracking.activeLimit,
          );
          tracking.activeLimit = null;
        }

        // Sync back to class state
        this.state = { ...state };
        this.tracking = { ...tracking };
      });
  }
}
