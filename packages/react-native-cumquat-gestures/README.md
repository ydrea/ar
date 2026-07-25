# react-native-cumquat-gestures

Worklet-safe two-finger AR controls for React Native.

The package extracts the gesture layer used by AR Atlas Otoka:

- horizontal two-finger movement changes field of view;
- vertical two-finger movement changes maximum render distance;
- vertical movement can also drive camera zoom;
- limit overshoot uses rubber-band resistance;
- gesture end snaps to a finite, ordered, valid state;
- all math helpers are deterministic and worklet-safe.

## Install

```sh
npm install react-native-cumquat-gestures \
  react-native-gesture-handler \
  react-native-reanimated
```

Your application must already be configured for React Native Gesture Handler and Reanimated.

## Controller usage

```tsx
import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import { useSharedValue } from 'react-native-reanimated';
import {
  gestureConfig,
  useARGestureController,
  type GestureState,
} from 'react-native-cumquat-gestures';

const initialState: GestureState = {
  minDistance: 0,
  maxDistance: 13_500,
  zoom: 0,
  fov: 90,
};

export function ARSurface() {
  const [state, setState] = useState(initialState);
  const cameraZoom = useSharedValue(initialState.zoom);

  const onUpdate = useCallback((update) => {
    setState(update.state);
  }, []);

  const controller = useARGestureController({
    initialState,
    cameraZoom,
    callbacks: { onUpdate },
    config: gestureConfig,
  });

  return (
    <GestureDetector gesture={controller.gesture}>
      <View style={{ flex: 1 }} />
    </GestureDetector>
  );
}
```

## Math-only usage

The math API has no runtime dependency on React components and is suitable for tests, custom controllers, or other UI runtimes.

```ts
import {
  createGestureInput,
  snapState,
  updateHorizontal,
  updateVertical,
  type GestureState,
} from 'react-native-cumquat-gestures';

const base: GestureState = {
  minDistance: 0,
  maxDistance: 13_500,
  zoom: 0,
  fov: 90,
};

const horizontal = updateHorizontal(
  base,
  createGestureInput(50, 0)
);

const vertical = updateVertical(
  horizontal.state,
  createGestureInput(0, -20)
);

const finalState = snapState(vertical.state);
```

## Custom tuning

Pass a complete `GestureConfig` to the controller or any update helper. Start from a cloned default to avoid mutating the shared package default.

```ts
import {
  cloneGestureConfig,
  useARGestureController,
} from 'react-native-cumquat-gestures';

const config = cloneGestureConfig();
config.distance.max = 250_000;
config.gesture.horizontalPixelToFov = 0.15;
config.gesture.zoomCouplingFactor = 0.35;

const controller = useARGestureController({
  initialState,
  config,
});
```

## Public API

### State and configuration

- `GestureState`
- `GestureConfig`
- `GestureInput`
- `GestureUpdate`
- `GestureMode`
- `LimitType`
- `gestureConfig`
- `cloneGestureConfig`

### Controller

- `useARGestureController`

### Worklet-safe math

- `createGestureInput`
- `validateState`
- `normalizeState`
- `snapState`
- `updateHorizontal`
- `updateVertical`
- `applyRubberBandValue`
- `rubberBandResistance`
- `getLimitExcess`
- `clamp`

## Development

```sh
npm install
npm test
npm run typecheck
npm run pack:check
```

## License

MIT
