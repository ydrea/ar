// cumquat/gestures/ArGestureControler.debug.ts
import { Gesture } from "react-native-gesture-handler";

export class ARGestureController {
  createGesture() {
    console.log('🔄 Creating debug gesture');
    
    return Gesture.Pan()
      .minPointers(2)
      .maxPointers(2)
      .onStart(() => {
        console.log('✅ Gesture started');
      })
      .onUpdate((event) => {
        console.log('🔄 Gesture updating:', {
          translationX: event.translationX,
          translationY: event.translationY,
        });
      })
      .onEnd(() => {
        console.log('✅ Gesture ended');
      });
  }
}