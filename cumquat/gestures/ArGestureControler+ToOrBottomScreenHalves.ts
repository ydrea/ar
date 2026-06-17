// cumquat/gestures/ARGestureController.ts
import { Gesture } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { Dimensions } from 'react-native';
import { AR_CONSTANTS } from '../constants';
import { Tlog } from '@/utils/tlog';

// Only import what you actually use
const { height: SCREEN_HEIGHT } = Dimensions.get('window');
// Remove SCREEN_WIDTH if not used

export type GestureMode = 'adjustMax' | 'adjustMin' | 'symmetric' | 'horizontal' | null;
export type LimitType = 'min' | 'max' | 'zoom' | 'fov' | null;

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

export class ARGestureController {
  private callbacks: GestureCallbacks | null = null;
  
  // Current state
  private minDistance = AR_CONSTANTS.DISTANCE.DEFAULT_MIN;
  private maxDistance = AR_CONSTANTS.DISTANCE.DEFAULT_MAX;
  private cameraZoom = 0;
  private fov = AR_CONSTANTS.FOV.DEFAULT;
  
  // Gesture tracking - using proper touch events
  private startTopY = 0;
  private startBottomY = 0;
  private startLeftX = 0;
  private startRightX = 0;
  private topTouchId: number | null = null;
  private bottomTouchId: number | null = null;
  private leftTouchId: number | null = null;
  private rightTouchId: number | null = null;
  private gestureMode: GestureMode = null;
  private movingFinger: 'top' | 'bottom' | 'both' | null = null;
  
  // Base values for delta calculations
  private baseMinDist = 0;
  private baseMaxDist = 0;
  private baseCameraZoom = 0;
  private baseFOV = 0;
  
  // Rubber band state
  private isRubberBanding = false;
  private activeLimit: LimitType = null;
  
  // Sensitivity
  private readonly VERTICAL_PIXEL_TO_METER = 400;
  private readonly VERTICAL_PIXEL_TO_ZOOM = 0.003;
  private readonly HORIZONTAL_PIXEL_TO_FOV = 0.2;
  private readonly RUBBER_BAND_FACTOR = 0.3;
  
  setCallbacks(callbacks: GestureCallbacks) {
    this.callbacks = callbacks;
  }
  
  updateState(min: number, max: number, zoom: number, fov: number) {
    this.minDistance = min;
    this.maxDistance = max;
    this.cameraZoom = zoom;
    this.fov = fov;
  }
  
  getState() {
    return { 
      min: this.minDistance, 
      max: this.maxDistance, 
      zoom: this.cameraZoom, 
      fov: this.fov 
    };
  }
  
  private checkLimitsAndApplyRubberBand(
    value: number,
    min: number,
    max: number,
    limit: LimitType
  ): { newValue: number; isRubberBanding: boolean; hitLimit: LimitType | null } {
    let newValue = value;
    let isRubberBanding = false;
    let hitLimit: LimitType | null = null;
    
    if (value < min) {
      isRubberBanding = true;
      hitLimit = limit;
      const excess = min - value;
      const resistance = 1 - Math.min(0.8, Math.log10(1 + excess / 100) * 0.15);
      newValue = min - (excess * this.RUBBER_BAND_FACTOR * resistance);
    } else if (value > max) {
      isRubberBanding = true;
      hitLimit = limit;
      const excess = value - max;
      const resistance = 1 - Math.min(0.8, Math.log10(1 + excess / 100) * 0.15);
      newValue = max + (excess * this.RUBBER_BAND_FACTOR * resistance);
    }
    
    return { newValue, isRubberBanding, hitLimit };
  }
  
  createGesture() {
    return Gesture.Pan()
      .minPointers(2)
      .maxPointers(2)
      .activateAfterLongPress(0)
      .onTouchesDown((event) => {
        if (event.allTouches.length !== 2) return;
        
        const [touch1, touch2] = event.allTouches;
        
        // Determine if gesture is more horizontal or vertical
        const deltaX = Math.abs(touch1.x - touch2.x);
        const deltaY = Math.abs(touch1.y - touch2.y);
        
        if (deltaX > deltaY * 1.5) {
          // Horizontal pinch - FOV control
          this.gestureMode = 'horizontal';
          
          if (touch1.x < touch2.x) {
            this.startLeftX = touch1.x;
            this.leftTouchId = touch1.id;
            this.startRightX = touch2.x;
            this.rightTouchId = touch2.id;
          } else {
            this.startLeftX = touch2.x;
            this.leftTouchId = touch2.id;
            this.startRightX = touch1.x;
            this.rightTouchId = touch1.id;
          }
          
          this.baseFOV = this.fov;
          if (this.callbacks) {
            runOnJS(this.callbacks.onGestureStart.bind(this.callbacks))('horizontal');
          }
          Tlog(`🎯 Horizontal pinch - FOV control`);
          
        } else {
          // Vertical pinch - Distance control
          if (touch1.y < touch2.y) {
            this.startTopY = touch1.y;
            this.topTouchId = touch1.id;
            this.startBottomY = touch2.y;
            this.bottomTouchId = touch2.id;
          } else {
            this.startTopY = touch2.y;
            this.topTouchId = touch2.id;
            this.startBottomY = touch1.y;
            this.bottomTouchId = touch1.id;
          }
          
          this.baseMinDist = this.minDistance;
          this.baseMaxDist = this.maxDistance;
          this.baseCameraZoom = this.cameraZoom;
          this.gestureMode = null;
          this.movingFinger = null;
          
          Tlog(`🎯 Vertical pinch started`);
        }
        
        this.isRubberBanding = false;
        this.activeLimit = null;
      })
      .onTouchesMove((event) => {
        if (event.allTouches.length !== 2) return;
        
        if (this.gestureMode === 'horizontal') {
          // Horizontal FOV control
          const leftTouch = event.allTouches.find(t => t.id === this.leftTouchId);
          const rightTouch = event.allTouches.find(t => t.id === this.rightTouchId);
          
          if (!leftTouch || !rightTouch) return;
          
          const leftDeltaX = leftTouch.x - this.startLeftX;
          const rightDeltaX = rightTouch.x - this.startRightX;
          
          // Pinching in (fingers closer) = decrease FOV (zoom in)
          // Spreading out (fingers apart) = increase FOV (zoom out)
          const pinchDelta = (rightDeltaX - leftDeltaX) / 2;
          const fovDelta = pinchDelta * this.HORIZONTAL_PIXEL_TO_FOV;
          
          let rawFOV = this.baseFOV + fovDelta;
          
          const { newValue, isRubberBanding, hitLimit } = this.checkLimitsAndApplyRubberBand(
            rawFOV,
            AR_CONSTANTS.FOV.MIN,
            AR_CONSTANTS.FOV.MAX,
            'fov'
          );
          
          this.fov = newValue;
          this.isRubberBanding = isRubberBanding;
          
          if (hitLimit && !this.activeLimit) {
            this.activeLimit = hitLimit;
            const excess = Math.abs(this.fov - (this.fov < AR_CONSTANTS.FOV.MIN ? AR_CONSTANTS.FOV.MIN : AR_CONSTANTS.FOV.MAX));
            if (this.callbacks) {
              runOnJS(this.callbacks.onLimitHit.bind(this.callbacks))(hitLimit, excess);
            }
          } else if (!hitLimit && this.activeLimit) {
            if (this.callbacks) {
              runOnJS(this.callbacks.onLimitRelease.bind(this.callbacks))(this.activeLimit);
            }
            this.activeLimit = null;
          }
          
          if (this.callbacks) {
            runOnJS(this.callbacks.onFOVChange.bind(this.callbacks))(this.fov, this.isRubberBanding);
            runOnJS(this.callbacks.onGestureUpdate.bind(this.callbacks))(this.gestureMode, {
              fov: this.fov,
              isRubberBanding: this.isRubberBanding,
            });
          }
          
        } else {
          // Vertical gesture
          const topTouch = event.allTouches.find(t => t.id === this.topTouchId);
          const bottomTouch = event.allTouches.find(t => t.id === this.bottomTouchId);
          
          if (!topTouch || !bottomTouch) return;
          
          const topDeltaY = topTouch.y - this.startTopY;
          const bottomDeltaY = bottomTouch.y - this.startBottomY;
          
          // Detect which finger is moving
          const isTopMoving = Math.abs(topDeltaY) > 10;
          const isBottomMoving = Math.abs(bottomDeltaY) > 10;
          
          // Classify gesture mode
          if (this.gestureMode === null) {
            if (isTopMoving && !isBottomMoving) {
              this.gestureMode = 'adjustMax';
              this.movingFinger = 'top';
              if (this.callbacks) {
                runOnJS(this.callbacks.onGestureStart.bind(this.callbacks))('adjustMax');
              }
              Tlog(`🎯 Adjusting MAX distance (top finger)`);
              
            } else if (isBottomMoving && !isTopMoving) {
              this.gestureMode = 'adjustMin';
              this.movingFinger = 'bottom';
              if (this.callbacks) {
                runOnJS(this.callbacks.onGestureStart.bind(this.callbacks))('adjustMin');
              }
              Tlog(`🎯 Adjusting MIN distance (bottom finger)`);
              
            } else if (isTopMoving && isBottomMoving) {
              this.gestureMode = 'symmetric';
              this.movingFinger = 'both';
              if (this.callbacks) {
                runOnJS(this.callbacks.onGestureStart.bind(this.callbacks))('symmetric');
              }
              Tlog(`🎯 Symmetric zoom (both fingers)`);
            }
          }
          
          let isRubberBanding = false;
          let hitLimit: LimitType | null = null;
          
          // INTUITIVE MAPPING:
          // Top finger UP = increase MAX distance (see further)
          // Top finger DOWN = decrease MAX distance
          // Bottom finger UP = increase MIN distance (near clip further)
          // Bottom finger DOWN = decrease MIN distance (near clip closer)
          
          if (this.gestureMode === 'adjustMax') {
            const maxDelta = -topDeltaY; // Moving UP = positive delta
            let rawMax = this.baseMaxDist + (maxDelta * this.VERTICAL_PIXEL_TO_METER);
            
            const maxResult = this.checkLimitsAndApplyRubberBand(
              rawMax,
              this.minDistance + 1000,
              AR_CONSTANTS.DISTANCE.MAX,
              'max'
            );
            this.maxDistance = maxResult.newValue;
            isRubberBanding = maxResult.isRubberBanding;
            hitLimit = maxResult.hitLimit;
            
            // Slight zoom adjustment
            let rawZoom = this.baseCameraZoom + (maxDelta * this.VERTICAL_PIXEL_TO_ZOOM * 0.5);
            const zoomResult = this.checkLimitsAndApplyRubberBand(rawZoom, 0, 1, 'zoom');
            this.cameraZoom = zoomResult.newValue;
            if (zoomResult.isRubberBanding) isRubberBanding = true;
            
            if (this.callbacks) {
              runOnJS(this.callbacks.onMaxDistanceChange.bind(this.callbacks))(this.maxDistance, isRubberBanding);
              runOnJS(this.callbacks.onCameraZoomChange.bind(this.callbacks))(this.cameraZoom, isRubberBanding);
            }
            
          } else if (this.gestureMode === 'adjustMin') {
            const minDelta = -bottomDeltaY; // Moving UP = positive delta
            let rawMin = this.baseMinDist + (minDelta * this.VERTICAL_PIXEL_TO_METER);
            
            const minResult = this.checkLimitsAndApplyRubberBand(
              rawMin,
              AR_CONSTANTS.DISTANCE.MIN,
              this.maxDistance - 1000,
              'min'
            );
            this.minDistance = minResult.newValue;
            isRubberBanding = minResult.isRubberBanding;
            hitLimit = minResult.hitLimit;
            
            if (this.callbacks) {
              runOnJS(this.callbacks.onMinDistanceChange.bind(this.callbacks))(this.minDistance, isRubberBanding);
            }
            
          } else if (this.gestureMode === 'symmetric') {
            const avgDeltaY = (topDeltaY + bottomDeltaY) / 2;
            const zoomDelta = -avgDeltaY; // Moving apart = zoom in
            
            let rawZoom = this.baseCameraZoom + (zoomDelta * this.VERTICAL_PIXEL_TO_ZOOM);
            const zoomResult = this.checkLimitsAndApplyRubberBand(rawZoom, 0, 1, 'zoom');
            this.cameraZoom = zoomResult.newValue;
            isRubberBanding = zoomResult.isRubberBanding;
            hitLimit = zoomResult.hitLimit;
            
            // Slight distance adjustment for context
            let rawMin = this.baseMinDist + (zoomDelta * this.VERTICAL_PIXEL_TO_METER * 0.2);
            let rawMax = this.baseMaxDist + (zoomDelta * this.VERTICAL_PIXEL_TO_METER * 0.3);
            
            const minResult = this.checkLimitsAndApplyRubberBand(rawMin, AR_CONSTANTS.DISTANCE.MIN, this.maxDistance - 1000, 'min');
            const maxResult = this.checkLimitsAndApplyRubberBand(rawMax, this.minDistance + 1000, AR_CONSTANTS.DISTANCE.MAX, 'max');
            
            this.minDistance = minResult.newValue;
            this.maxDistance = maxResult.newValue;
            if (minResult.isRubberBanding || maxResult.isRubberBanding) isRubberBanding = true;
            
            if (this.callbacks) {
              runOnJS(this.callbacks.onMinDistanceChange.bind(this.callbacks))(this.minDistance, isRubberBanding);
              runOnJS(this.callbacks.onMaxDistanceChange.bind(this.callbacks))(this.maxDistance, isRubberBanding);
              runOnJS(this.callbacks.onCameraZoomChange.bind(this.callbacks))(this.cameraZoom, isRubberBanding);
            }
          }
          
          this.isRubberBanding = isRubberBanding;
          
          if (hitLimit && !this.activeLimit) {
            this.activeLimit = hitLimit;
            const excess = this.getExcessForLimit(hitLimit);
            if (this.callbacks) {
              runOnJS(this.callbacks.onLimitHit.bind(this.callbacks))(hitLimit, excess);
            }
          } else if (!hitLimit && this.activeLimit) {
            if (this.callbacks) {
              runOnJS(this.callbacks.onLimitRelease.bind(this.callbacks))(this.activeLimit);
            }
            this.activeLimit = null;
          }
          
          if (this.callbacks) {
            runOnJS(this.callbacks.onGestureUpdate.bind(this.callbacks))(this.gestureMode, {
              min: this.minDistance,
              max: this.maxDistance,
              zoom: this.cameraZoom,
              isRubberBanding: this.isRubberBanding,
            });
          }
        }
      })
      .onTouchesUp((event) => {
        if (this.gestureMode === 'horizontal') {
          let finalFOV = this.fov;
          if (this.isRubberBanding) {
            finalFOV = Math.max(AR_CONSTANTS.FOV.MIN, Math.min(AR_CONSTANTS.FOV.MAX, this.fov));
            if (this.callbacks) {
              runOnJS(this.callbacks.onFOVChange.bind(this.callbacks))(finalFOV, false);
            }
            this.fov = finalFOV;
          }
          
          Tlog(`✅ Horizontal ended - FOV: ${finalFOV.toFixed(1)}°`);
          
          if (this.gestureMode && this.callbacks) {
            runOnJS(this.callbacks.onGestureEnd.bind(this.callbacks))(this.gestureMode, {
              fov: finalFOV,
            });
          }
          
        } else {
          let finalMin = this.minDistance;
          let finalMax = this.maxDistance;
          let finalZoom = this.cameraZoom;
          
          if (this.isRubberBanding) {
            finalMin = Math.max(AR_CONSTANTS.DISTANCE.MIN, Math.min(this.maxDistance - 1000, this.minDistance));
            finalMax = Math.min(AR_CONSTANTS.DISTANCE.MAX, Math.max(this.minDistance + 1000, this.maxDistance));
            finalZoom = Math.max(0, Math.min(1, this.cameraZoom));
            
            if (this.callbacks) {
              runOnJS(this.callbacks.onMinDistanceChange.bind(this.callbacks))(finalMin, false);
              runOnJS(this.callbacks.onMaxDistanceChange.bind(this.callbacks))(finalMax, false);
              runOnJS(this.callbacks.onCameraZoomChange.bind(this.callbacks))(finalZoom, false);
            }
            
            this.minDistance = finalMin;
            this.maxDistance = finalMax;
            this.cameraZoom = finalZoom;
          }
          
          Tlog(`✅ Vertical ended - Min: ${(finalMin/1000).toFixed(1)}km, Max: ${(finalMax/1000).toFixed(1)}km`);
          
          if (this.gestureMode && this.callbacks) {
            runOnJS(this.callbacks.onGestureEnd.bind(this.callbacks))(this.gestureMode, {
              min: finalMin,
              max: finalMax,
              zoom: finalZoom,
            });
          }
        }
        
        // Reset state
        this.topTouchId = null;
        this.bottomTouchId = null;
        this.leftTouchId = null;
        this.rightTouchId = null;
        this.gestureMode = null;
        this.movingFinger = null;
        this.isRubberBanding = false;
        
        if (this.activeLimit && this.callbacks) {
          runOnJS(this.callbacks.onLimitRelease.bind(this.callbacks))(this.activeLimit);
          this.activeLimit = null;
        }
      });
  }
  
  private getExcessForLimit(limit: LimitType): number {
    switch (limit) {
      case 'min': return Math.max(0, AR_CONSTANTS.DISTANCE.MIN - this.minDistance);
      case 'max': return Math.max(0, this.maxDistance - AR_CONSTANTS.DISTANCE.MAX);
      case 'zoom': return Math.max(0, Math.abs(this.cameraZoom - (this.cameraZoom > 1 ? 1 : 0)));
      case 'fov':
        if (this.fov < AR_CONSTANTS.FOV.MIN) return AR_CONSTANTS.FOV.MIN - this.fov;
        if (this.fov > AR_CONSTANTS.FOV.MAX) return this.fov - AR_CONSTANTS.FOV.MAX;
        return 0;
      default: return 0;
    }
  }
}