// gestures.ts - Add this to your cumquat folder
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSharedValue, withSpring } from 'react-native-reanimated';
import { Dimensions } from 'react-native';
import { AR_CONSTANTS } from './constants';
import { Tlog } from '@/utils/tlog';

type PinchDirection = 'fromAbove' | 'fromBelow' | null;

export class ARGestureController {
  private minDistance = AR_CONSTANTS.DISTANCE.DEFAULT_MIN;
  private maxDistance = AR_CONSTANTS.DISTANCE.DEFAULT_MAX;
  private onLimitsChange?: (min: number, max: number) => void;
  private screenHeight = Dimensions.get('window').height;
  
  // Sensitivity factor - lower = less sensitive
  private readonly SENSITIVITY = 0.5;
  
  setCallbacks(onLimitsChange: (min: number, max: number) => void) {
    this.onLimitsChange = onLimitsChange;
  }
  
  createPinchGesture() {
    let direction: PinchDirection = null;
    let startMinDistance = this.minDistance;
    let startMaxDistance = this.maxDistance;
    
    return Gesture.Pinch()
      .onStart((e) => {
        // Detect if pinch is in top or bottom half of screen
        const isAbove = e.focalY < this.screenHeight / 2;
        direction = isAbove ? 'fromAbove' : 'fromBelow';
        
        startMinDistance = this.minDistance;
        startMaxDistance = this.maxDistance;
        
        Tlog(`🎯 Pinch ${direction} started at y=${e.focalY.toFixed(0)}`);
      })
      .onUpdate((e) => {
        if (!direction) return;
        
        // Convert scale delta to distance delta
        // scale: 1.0 = no change, >1 = zoom in, <1 = zoom out
        const scaleDelta = e.scale - 1;
        const deltaMeters = scaleDelta * 1000 * this.SENSITIVITY; // 1000m base sensitivity
        
        if (direction === 'fromAbove') {
          // Pinch from above → adjust MIN distance (how close you can get)
          let newMin = startMinDistance + deltaMeters;
          newMin = Math.max(0, Math.min(newMin, this.maxDistance - 10));
          this.minDistance = newMin;
          
          Tlog(`📏 Min distance: ${this.minDistance.toFixed(0)}m`);
        } else {
          // Pinch from below → adjust MAX distance (how far you can see)
          let newMax = startMaxDistance + deltaMeters;
          newMax = Math.max(this.minDistance + 10, Math.min(newMax, AR_CONSTANTS.DISTANCE.MAX));
          this.maxDistance = newMax;
          
          Tlog(`🌍 Max distance: ${this.maxDistance.toFixed(0)}m`);
        }
        
        // Notify your AR engine of the changes
        this.onLimitsChange?.(this.minDistance, this.maxDistance);
      })
      .onEnd(() => {
        direction = null;
        Tlog(`✅ Pinch ended - final limits: min=${this.minDistance.toFixed(0)}m, max=${this.maxDistance.toFixed(0)}m`);
      });
  }
  
  getLimits() {
    return { min: this.minDistance, max: this.maxDistance };
  }
  
  setLimits(min: number, max: number) {
    this.minDistance = min;
    this.maxDistance = max;
    this.onLimitsChange?.(min, max);
  }
}