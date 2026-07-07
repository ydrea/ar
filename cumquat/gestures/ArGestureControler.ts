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

interface GestureState {
  minDistance: number;
  maxDistance: number;
  cameraZoom: number;
  fov: number;
}

interface GestureTracking {
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

  private state: GestureState = {
    minDistance: AR_CONSTANTS.DISTANCE.DEFAULT_MIN,
    maxDistance: AR_CONSTANTS.DISTANCE.DEFAULT_MAX,
    cameraZoom: 0,
    fov: AR_CONSTANTS.FOV.DEFAULT,
  };

  private readonly VERTICAL_PIXEL_TO_METER = 400;
  private readonly VERTICAL_PIXEL_TO_ZOOM = 0.003;
  private readonly HORIZONTAL_PIXEL_TO_FOV = 0.2;
  private readonly RUBBER_BAND_FACTOR = 0.3;

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

  private getExcessForLimit(limit: LimitType): number {
    switch (limit) {
      case "min":
        return Math.max(0, AR_CONSTANTS.DISTANCE.MIN - this.state.minDistance);
      case "max":
        return Math.max(0, this.state.maxDistance - AR_CONSTANTS.DISTANCE.MAX);
      case "zoom":
        return Math.max(
          0,
          Math.abs(this.state.cameraZoom - (this.state.cameraZoom > 1 ? 1 : 0)),
        );
      case "fov":
        if (this.state.fov < AR_CONSTANTS.FOV.MIN)
          return AR_CONSTANTS.FOV.MIN - this.state.fov;
        if (this.state.fov > AR_CONSTANTS.FOV.MAX)
          return this.state.fov - AR_CONSTANTS.FOV.MAX;
        return 0;
      default:
        return 0;
    }
  }
  ////////////////////////////////

  ////////////////////////////////
  // cumquat/gestures/ArGestureControler.ts - Corrected createGesture()

  createGesture() {
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

    const initialState = this.getState();
    let state: GestureState = {
      minDistance: initialState.minDistance,
      maxDistance: initialState.maxDistance,
      cameraZoom: initialState.cameraZoom,
      fov: initialState.fov,
    };

    let tracking: GestureTracking = {
      gestureMode: null,
      movingFinger: null,
      baseMinDist: state.minDistance,
      baseMaxDist: state.maxDistance,
      baseCameraZoom: state.cameraZoom,
      baseFOV: state.fov,
      isRubberBanding: false,
      activeLimit: null,
    };

    const checkLimits = (
      value: number,
      min: number,
      max: number,
      limit: LimitType,
    ) => {
      "worklet";
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
      "worklet";
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

    const syncState = (s: GestureState) => {
      this.state = { ...s };
    };

    // ✅ CORRECT for gesture-handler 2.x:
    // - .onBegin() for initialization (runs on JS thread)
    // - .onUpdate() for updates (worklet)
    // - .onEnd() for cleanup (worklet)
    return Gesture.Pan()
      .minPointers(2)
      .maxPointers(2)
      .activateAfterLongPress(0)
      .onBegin(() => {
        // Reset tracking state - runs on JS thread
        tracking.gestureMode = null;
        tracking.movingFinger = null;
        tracking.isRubberBanding = false;
        tracking.activeLimit = null;
        tracking.baseMinDist = state.minDistance;
        tracking.baseMaxDist = state.maxDistance;
        tracking.baseCameraZoom = state.cameraZoom;
        tracking.baseFOV = state.fov;

        if (__DEV__) console.log(`🎯 Gesture started`);
      })
      .onUpdate((event) => {
        // ✅ onUpdate has translationX/Y (worklet)
        const translationX = event.translationX || 0;
        const translationY = event.translationY || 0;

        // Detect gesture mode on first movement
        if (tracking.gestureMode === null) {
          const absX = Math.abs(translationX);
          const absY = Math.abs(translationY);

          if (absX > absY * 1.5 && absX > 20) {
            tracking.gestureMode = "horizontal";
            if (callbacks?.onGestureStart) {
              runOnJS(callbacks.onGestureStart)("horizontal");
            }
            if (__DEV__) console.log(`🎯 Horizontal pinch - FOV control`);
          } else if (absY > absX * 1.5 && absY > 20) {
            tracking.gestureMode = "adjustMax";
            tracking.movingFinger = "top";
            if (callbacks?.onGestureStart) {
              runOnJS(callbacks.onGestureStart)("adjustMax");
            }
            if (__DEV__) console.log(`🎯 Vertical pinch - distance control`);
          }
        }

        // Handle the actual gesture updates
        if (tracking.gestureMode === "horizontal") {
          const fovDelta = translationX * constants.HORIZONTAL_PIXEL_TO_FOV;
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
            if (callbacks?.onLimitHit) {
              runOnJS(callbacks.onLimitHit)(hitLimit, excess);
            }
          } else if (!hitLimit && tracking.activeLimit) {
            if (callbacks?.onLimitRelease) {
              runOnJS(callbacks.onLimitRelease)(tracking.activeLimit);
            }
            tracking.activeLimit = null;
          }

          if (callbacks?.onFOVChange) {
            runOnJS(callbacks.onFOVChange)(state.fov, tracking.isRubberBanding);
          }
          if (callbacks?.onGestureUpdate) {
            runOnJS(callbacks.onGestureUpdate)(tracking.gestureMode, {
              fov: state.fov,
              isRubberBanding: tracking.isRubberBanding,
            });
          }
        } else if (tracking.gestureMode === "adjustMax") {
          const maxDelta = -translationY;
          let rawMax =
            tracking.baseMaxDist + maxDelta * constants.VERTICAL_PIXEL_TO_METER;

          const maxResult = checkLimits(
            rawMax,
            state.minDistance + 1000,
            constants.DISTANCE_MAX,
            "max",
          );
          state.maxDistance = maxResult.newValue;
          let isRubberBanding = maxResult.isRubberBanding;
          let hitLimit = maxResult.hitLimit;

          let rawZoom =
            tracking.baseCameraZoom +
            maxDelta * constants.VERTICAL_PIXEL_TO_ZOOM * 0.5;
          const zoomResult = checkLimits(rawZoom, 0, 1, "zoom");
          state.cameraZoom = zoomResult.newValue;
          if (zoomResult.isRubberBanding) isRubberBanding = true;

          tracking.isRubberBanding = isRubberBanding;

          if (hitLimit && !tracking.activeLimit) {
            tracking.activeLimit = hitLimit;
            const excess = getExcess(hitLimit);
            if (callbacks?.onLimitHit) {
              runOnJS(callbacks.onLimitHit)(hitLimit, excess);
            }
          } else if (!hitLimit && tracking.activeLimit) {
            if (callbacks?.onLimitRelease) {
              runOnJS(callbacks.onLimitRelease)(tracking.activeLimit);
            }
            tracking.activeLimit = null;
          }

          if (callbacks?.onMaxDistanceChange) {
            runOnJS(callbacks.onMaxDistanceChange)(
              state.maxDistance,
              isRubberBanding,
            );
          }
          if (callbacks?.onCameraZoomChange) {
            runOnJS(callbacks.onCameraZoomChange)(
              state.cameraZoom,
              isRubberBanding,
            );
          }
          if (callbacks?.onGestureUpdate) {
            runOnJS(callbacks.onGestureUpdate)(tracking.gestureMode, {
              min: state.minDistance,
              max: state.maxDistance,
              zoom: state.cameraZoom,
              isRubberBanding: tracking.isRubberBanding,
            });
          }
        }
      })
      .onEnd(() => {
        if (tracking.gestureMode === "horizontal") {
          let finalFOV = state.fov;
          if (tracking.isRubberBanding) {
            finalFOV = Math.max(
              constants.FOV_MIN,
              Math.min(constants.FOV_MAX, state.fov),
            );
            state.fov = finalFOV;
            if (callbacks?.onFOVChange) {
              runOnJS(callbacks.onFOVChange)(finalFOV, false);
            }
          }

          if (__DEV__)
            console.log(`✅ Horizontal ended - FOV: ${finalFOV.toFixed(1)}°`);

          if (tracking.gestureMode && callbacks?.onGestureEnd) {
            runOnJS(callbacks.onGestureEnd)(tracking.gestureMode, {
              fov: finalFOV,
            });
          }
        } else if (tracking.gestureMode === "adjustMax") {
          let finalMin = state.minDistance;
          let finalMax = state.maxDistance;
          let finalZoom = state.cameraZoom;

          if (tracking.isRubberBanding) {
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

            if (callbacks?.onMinDistanceChange) {
              runOnJS(callbacks.onMinDistanceChange)(finalMin, false);
            }
            if (callbacks?.onMaxDistanceChange) {
              runOnJS(callbacks.onMaxDistanceChange)(finalMax, false);
            }
            if (callbacks?.onCameraZoomChange) {
              runOnJS(callbacks.onCameraZoomChange)(finalZoom, false);
            }
          }

          if (__DEV__) {
            console.log(
              `✅ Vertical ended - Min: ${(finalMin / 1000).toFixed(1)}km, Max: ${(finalMax / 1000).toFixed(1)}km`,
            );
          }

          if (tracking.gestureMode && callbacks?.onGestureEnd) {
            runOnJS(callbacks.onGestureEnd)(tracking.gestureMode, {
              min: finalMin,
              max: finalMax,
              zoom: finalZoom,
            });
          }
        }

        // Reset tracking state - MUTATE, don't reassign
        tracking.gestureMode = null;
        tracking.movingFinger = null;
        tracking.isRubberBanding = false;
        tracking.activeLimit = null;
        tracking.baseMinDist = state.minDistance;
        tracking.baseMaxDist = state.maxDistance;
        tracking.baseCameraZoom = state.cameraZoom;
        tracking.baseFOV = state.fov;

        // Sync back to class state using runOnJS
        runOnJS(syncState)(state);
      });
  }
  // createGesture() {
  //   const callbacks = this.callbacks;

  //   // Store constants as plain object for worklet access
  //   const constants = {
  //     FOV_MIN: AR_CONSTANTS.FOV.MIN,
  //     FOV_MAX: AR_CONSTANTS.FOV.MAX,
  //     DISTANCE_MIN: AR_CONSTANTS.DISTANCE.MIN,
  //     DISTANCE_MAX: AR_CONSTANTS.DISTANCE.MAX,
  //     VERTICAL_PIXEL_TO_METER: this.VERTICAL_PIXEL_TO_METER,
  //     VERTICAL_PIXEL_TO_ZOOM: this.VERTICAL_PIXEL_TO_ZOOM,
  //     HORIZONTAL_PIXEL_TO_FOV: this.HORIZONTAL_PIXEL_TO_FOV,
  //     RUBBER_BAND_FACTOR: this.RUBBER_BAND_FACTOR,
  //   };

  //   // Create local copies - these are plain objects that CAN be sent to UI thread
  //   let state = { ...this.state };
  //   let tracking: GestureTracking = {
  //     gestureMode: null,
  //     movingFinger: null,
  //     baseMinDist: state.minDistance,
  //     baseMaxDist: state.maxDistance,
  //     baseCameraZoom: state.cameraZoom,
  //     baseFOV: state.fov,
  //     isRubberBanding: false,
  //     activeLimit: null,
  //   };

  //   // Helper to check limits - works with plain objects
  //   const checkLimits = (
  //     value: number,
  //     min: number,
  //     max: number,
  //     limit: LimitType,
  //   ) => {
  //     let newValue = value;
  //     let isRubberBanding = false;
  //     let hitLimit: LimitType | null = null;

  //     if (value < min) {
  //       isRubberBanding = true;
  //       hitLimit = limit;
  //       const excess = min - value;
  //       const resistance = 1 - Math.min(0.8, Math.log10(1 + excess / 100) * 0.15);
  //       newValue = min - excess * constants.RUBBER_BAND_FACTOR * resistance;
  //     } else if (value > max) {
  //       isRubberBanding = true;
  //       hitLimit = limit;
  //       const excess = value - max;
  //       const resistance = 1 - Math.min(0.8, Math.log10(1 + excess / 100) * 0.15);
  //       newValue = max + excess * constants.RUBBER_BAND_FACTOR * resistance;
  //     }

  //     return { newValue, isRubberBanding, hitLimit };
  //   };

  //   const getExcess = (limit: LimitType) => {
  //     switch (limit) {
  //       case "min":
  //         return Math.max(0, constants.DISTANCE_MIN - state.minDistance);
  //       case "max":
  //         return Math.max(0, state.maxDistance - constants.DISTANCE_MAX);
  //       case "zoom":
  //         return Math.max(0, Math.abs(state.cameraZoom - (state.cameraZoom > 1 ? 1 : 0)));
  //       case "fov":
  //         if (state.fov < constants.FOV_MIN) return constants.FOV_MIN - state.fov;
  //         if (state.fov > constants.FOV_MAX) return state.fov - constants.FOV_MAX;
  //         return 0;
  //       default:
  //         return 0;
  //     }
  //   };

  //   return Gesture.Pan()
  //     .minPointers(2)
  //     .maxPointers(2)
  //     .activateAfterLongPress(0)
  //     .onStart(() => {
  //       // Reset tracking state
  //       tracking.gestureMode = null;
  //       tracking.isRubberBanding = false;
  //       tracking.activeLimit = null;
  //       tracking.baseMinDist = state.minDistance;
  //       tracking.baseMaxDist = state.maxDistance;
  //       tracking.baseCameraZoom = state.cameraZoom;
  //       tracking.baseFOV = state.fov;

  //       if (__DEV__) console.log(`🎯 Gesture started`);
  //     })
  //     .onUpdate((event) => {
  //       const translationX = event.translationX || 0;
  //       const translationY = event.translationY || 0;

  //       // Detect gesture mode on first movement
  //       if (tracking.gestureMode === null) {
  //         const absX = Math.abs(translationX);
  //         const absY = Math.abs(translationY);

  //         if (absX > absY * 1.5 && absX > 20) {
  //           // Horizontal - FOV control
  //           tracking.gestureMode = "horizontal";
  //           if (callbacks) {
  //             runOnJS(callbacks.onGestureStart)("horizontal");
  //           }
  //           if (__DEV__) console.log(`🎯 Horizontal pinch - FOV control`);
  //         } else if (absY > absX * 1.5 && absY > 20) {
  //           // Vertical - Distance control
  //           tracking.gestureMode = "adjustMax";
  //           tracking.movingFinger = "top";
  //           if (callbacks) {
  //             runOnJS(callbacks.onGestureStart)("adjustMax");
  //           }
  //           if (__DEV__) console.log(`🎯 Vertical pinch - distance control`);
  //         }
  //       }

  //       // Handle the actual gesture updates
  //       if (tracking.gestureMode === "horizontal") {
  //         // FOV control using translationX
  //         const fovDelta = translationX * constants.HORIZONTAL_PIXEL_TO_FOV;
  //         let rawFOV = tracking.baseFOV + fovDelta;

  //         const { newValue, isRubberBanding, hitLimit } = checkLimits(
  //           rawFOV,
  //           constants.FOV_MIN,
  //           constants.FOV_MAX,
  //           "fov",
  //         );

  //         state.fov = newValue;
  //         tracking.isRubberBanding = isRubberBanding;

  //         if (hitLimit && !tracking.activeLimit) {
  //           tracking.activeLimit = hitLimit;
  //           const excess = Math.abs(
  //             state.fov -
  //               (state.fov < constants.FOV_MIN
  //                 ? constants.FOV_MIN
  //                 : constants.FOV_MAX),
  //           );
  //           if (callbacks) {
  //             runOnJS(callbacks.onLimitHit)(hitLimit, excess);
  //           }
  //         } else if (!hitLimit && tracking.activeLimit) {
  //           if (callbacks) {
  //             runOnJS(callbacks.onLimitRelease)(tracking.activeLimit);
  //           }
  //           tracking.activeLimit = null;
  //         }

  //         if (callbacks) {
  //           runOnJS(callbacks.onFOVChange)(
  //             state.fov,
  //             tracking.isRubberBanding,
  //           );
  //           runOnJS(callbacks.onGestureUpdate)(tracking.gestureMode, {
  //             fov: state.fov,
  //             isRubberBanding: tracking.isRubberBanding,
  //           });
  //         }
  //       } else if (tracking.gestureMode === "adjustMax") {
  //         // Vertical distance control
  //         const maxDelta = -translationY;
  //         let rawMax =
  //           tracking.baseMaxDist + maxDelta * constants.VERTICAL_PIXEL_TO_METER;

  //         const maxResult = checkLimits(
  //           rawMax,
  //           state.minDistance + 1000,
  //           constants.DISTANCE_MAX,
  //           "max",
  //         );
  //         state.maxDistance = maxResult.newValue;
  //         let isRubberBanding = maxResult.isRubberBanding;
  //         let hitLimit = maxResult.hitLimit;

  //         // Slight zoom adjustment
  //         let rawZoom =
  //           tracking.baseCameraZoom +
  //           maxDelta * constants.VERTICAL_PIXEL_TO_ZOOM * 0.5;
  //         const zoomResult = checkLimits(rawZoom, 0, 1, "zoom");
  //         state.cameraZoom = zoomResult.newValue;
  //         if (zoomResult.isRubberBanding) isRubberBanding = true;

  //         tracking.isRubberBanding = isRubberBanding;

  //         if (hitLimit && !tracking.activeLimit) {
  //           tracking.activeLimit = hitLimit;
  //           const excess = getExcess(hitLimit);
  //           if (callbacks) {
  //             runOnJS(callbacks.onLimitHit)(hitLimit, excess);
  //           }
  //         } else if (!hitLimit && tracking.activeLimit) {
  //           if (callbacks) {
  //             runOnJS(callbacks.onLimitRelease)(tracking.activeLimit);
  //           }
  //           tracking.activeLimit = null;
  //         }

  //         if (callbacks) {
  //           runOnJS(callbacks.onMaxDistanceChange)(
  //             state.maxDistance,
  //             isRubberBanding,
  //           );
  //           runOnJS(callbacks.onCameraZoomChange)(
  //             state.cameraZoom,
  //             isRubberBanding,
  //           );
  //           runOnJS(callbacks.onGestureUpdate)(tracking.gestureMode, {
  //             min: state.minDistance,
  //             max: state.maxDistance,
  //             zoom: state.cameraZoom,
  //             isRubberBanding: tracking.isRubberBanding,
  //           });
  //         }
  //       }
  //     })
  //     .onEnd(() => {
  //       if (tracking.gestureMode === "horizontal") {
  //         let finalFOV = state.fov;
  //         if (tracking.isRubberBanding) {
  //           finalFOV = Math.max(
  //             constants.FOV_MIN,
  //             Math.min(constants.FOV_MAX, state.fov),
  //           );
  //           state.fov = finalFOV;
  //           if (callbacks) {
  //             runOnJS(callbacks.onFOVChange)(finalFOV, false);
  //           }
  //         }

  //         if (__DEV__)
  //           console.log(`✅ Horizontal ended - FOV: ${finalFOV.toFixed(1)}°`);

  //         if (tracking.gestureMode && callbacks) {
  //           runOnJS(callbacks.onGestureEnd)(tracking.gestureMode, {
  //             fov: finalFOV,
  //           });
  //         }
  //       } else if (tracking.gestureMode === "adjustMax") {
  //         let finalMin = state.minDistance;
  //         let finalMax = state.maxDistance;
  //         let finalZoom = state.cameraZoom;

  //         if (tracking.isRubberBanding) {
  //           finalMin = Math.max(
  //             constants.DISTANCE_MIN,
  //             Math.min(state.maxDistance - 100, state.minDistance),
  //           );
  //           finalMax = Math.min(
  //             constants.DISTANCE_MAX,
  //             Math.max(state.minDistance + 100, state.maxDistance),
  //           );
  //           finalZoom = Math.max(0, Math.min(1, state.cameraZoom));

  //           state.minDistance = finalMin;
  //           state.maxDistance = finalMax;
  //           state.cameraZoom = finalZoom;

  //           if (callbacks) {
  //             runOnJS(callbacks.onMinDistanceChange)(finalMin, false);
  //             runOnJS(callbacks.onMaxDistanceChange)(finalMax, false);
  //             runOnJS(callbacks.onCameraZoomChange)(finalZoom, false);
  //           }
  //         }

  //         if (__DEV__) {
  //           console.log(
  //             `✅ Vertical ended - Min: ${(finalMin / 1000).toFixed(1)}km, Max: ${(finalMax / 1000).toFixed(1)}km`,
  //           );
  //         }

  //         if (tracking.gestureMode && callbacks) {
  //           runOnJS(callbacks.onGestureEnd)(tracking.gestureMode, {
  //             min: finalMin,
  //             max: finalMax,
  //             zoom: finalZoom,
  //           });
  //         }
  //       }

  //       // Reset tracking state
  //       tracking = {
  //         gestureMode: null,
  //         movingFinger: null,
  //         baseMinDist: state.minDistance,
  //         baseMaxDist: state.maxDistance,
  //         baseCameraZoom: state.cameraZoom,
  //         baseFOV: state.fov,
  //         isRubberBanding: false,
  //         activeLimit: null,
  //       };

  //       // Sync back to class state
  //       this.state = { ...state };
  //     });
  // }
}
