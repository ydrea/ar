# Cumquat Native Engine

`@cumquat/native-engine` is the stateful C++ projection engine used by the AR view.

The canonical native source lives in:

```text
modules/cumquat-native/cpp/
```

Do not treat files generated under `android/` as the source of truth. The Expo config plugin regenerates the Android integration and points it back to this directory.

## Status

- React Native New Architecture TurboModule
- Shared C++20 implementation
- Android integration through an Expo config plugin
- TypeScript wrapper around the generated TurboModule spec
- App-local/private package at the moment
- iOS native integration is not implemented yet

## Architecture

```text
ARBetaNativeOverlayView.tsx
        |
        | TypeScript API
        v
src/CumquatEngine.ts
        |
        | generated TurboModule interface
        v
specs/NativeCumquat.ts
        |
        | React Native Codegen / JSI
        v
cpp/bridge/NativeCumquatModule.cpp
        |
        | owns engine handles
        v
cpp/core/Engine.cpp
        |
        +--> cpp/geo/Geodesy.cpp
        |
        +--> cpp/projection/Projection.cpp
```

The intended runtime flow is:

1. Create one engine instance.
2. Initialize it with the POI dataset.
3. Update mutable view state when gestures change FOV or distance limits.
4. Feed sensor snapshots to `update()`.
5. Read the latest frame with `getFrame()`.
6. Optionally hit-test visible POIs with `pick()`.
7. Dispose the engine when the screen unmounts.

## Source layout

```text
modules/cumquat-native/
├── README.md
├── package.json
├── specs/
│   └── NativeCumquat.ts
├── src/
│   ├── CumquatEngine.ts
│   ├── NativeCumquat.ts
│   ├── index.ts
│   └── types.ts
└── cpp/
    ├── bridge/
    │   ├── NativeCumquatModule.cpp
    │   └── NativeCumquatModule.h
    ├── core/
    │   ├── Engine.cpp
    │   ├── Engine.h
    │   └── Types.h
    ├── geo/
    │   ├── Geodesy.cpp
    │   └── Geodesy.h
    ├── math/
    │   └── Vec3.h
    └── projection/
        ├── Projection.cpp
        └── Projection.h
```

### `specs/NativeCumquat.ts`

The React Native Codegen contract. It defines the low-level TurboModule methods:

```text
getVersion
createEngine
initialize
setViewState
update
getFrame
pick
destroyEngine
```

The spec intentionally uses Codegen-compatible object types. Application-facing TypeScript types are defined separately in `src/types.ts`.

### `src/CumquatEngine.ts`

The typed JavaScript wrapper used by the application.

It:

- creates and stores a native engine handle;
- exposes the public API as a class;
- prevents calls after disposal;
- keeps raw TurboModule calls out of UI code.

### `cpp/bridge/NativeCumquatModule.*`

The JSI/TurboModule bridge.

It:

- converts JavaScript objects and arrays into C++ structures;
- stores multiple engine instances in a handle map;
- validates engine handles;
- serializes frame data back across the JSI boundary;
- protects the engine registry with a mutex.

This layer should contain transport and validation logic, not projection policy.

### `cpp/core/Engine.*`

The central stateful engine.

It owns:

- immutable engine configuration;
- the initialized POI dataset;
- mutable view state;
- the most recent frame snapshot;
- visible-POI picking.

`initialize()` normally runs once per engine instance. Gesture changes should call `setViewState()` rather than recreate or reinitialize the engine.

### `cpp/core/Types.h`

The canonical native data model:

- `GeoPoint`
- `Quaternion`
- `POI`
- `EngineConfig`
- `ViewState`
- `SensorState`
- `VisiblePOI`
- `FrameSnapshot`
- `PickResult`

Keep this file synchronized conceptually with `src/types.ts` whenever the public data contract changes.

### `cpp/geo/Geodesy.*`

Geographic calculations:

- WGS84-style geodetic point to ECEF conversion;
- ECEF to local ENU conversion;
- initial bearing calculation.

The local world coordinate system is ENU:

```text
+x = east
+y = north
+z = up
```

### `cpp/projection/Projection.*`

Camera transformation and screen projection.

The engine supports two orientation paths:

1. Quaternion mode, used by the current JavaScript sensor pipeline.
2. Heading/pitch/roll mode, retained for conventional native callers and tests.

Quaternion mode intentionally mirrors the existing JavaScript `q * v * q^-1` behavior. It also calculates directional screen coordinates for behind-camera POIs so the UI can place stable edge indicators even when `visible` is false.

### `cpp/math/Vec3.h`

Minimal shared three-dimensional vector type used by geodesy and projection.

## Public TypeScript API

```ts
import {CumquatEngine} from "@/modules/cumquat-native/src";
import type {
  POIInput,
  SensorState,
  ViewState,
} from "@/modules/cumquat-native/src";
```

### Create

```ts
const engine = CumquatEngine.create({
  datasetRadiusMeters: 135_000,
  maxVisiblePOIs: 256,
});
```

`datasetRadiusMeters` is a hard, immutable spatial boundary. POIs outside it are not projected and do not cross the JSI boundary.

`maxVisiblePOIs` limits the `visiblePOIs` list. It does not limit the full `projectedPOIs` list for POIs inside the hard dataset radius.

### Initialize

```ts
const pois: readonly POIInput[] = [
  {
    id: "26",
    name: "Sljeme",
    latitude: 45.89946265300375,
    longitude: 15.94482091926767,
    altitude: 1033,
  },
];

engine.initialize(pois);
```

POI ordering matters. Native frame results return `poiIndex`, which refers to the index in this initialized array.

### Set mutable view state

```ts
const viewState: ViewState = {
  horizontalFovDegrees: 90,
  minDistanceMeters: 0,
  maxDistanceMeters: 13_500,
};

engine.setViewState(viewState);
```

Current native validation requires:

- horizontal FOV greater than `1` and less than `179` degrees;
- minimum distance greater than or equal to `0`;
- maximum distance strictly greater than minimum distance;
- all values finite.

### Update from sensors

```ts
const sensorState: SensorState = {
  timestampNs: Date.now() * 1_000_000,
  location: {
    latitude: 45.80041,
    longitude: 15.95619,
    altitude: 120,
  },
  orientationQuaternion: {
    x: 0,
    y: 0,
    z: 0,
    w: 1,
  },
  headingDegrees: 0,
  pitchDegrees: 0,
  rollDegrees: 0,
  viewportWidth: 1000,
  viewportHeight: 600,
};

const sequence = engine.update(sensorState);
```

When `orientationQuaternion` is present, quaternion mode is used. Otherwise the heading/pitch/roll path is used.

`update()` returns the monotonically increasing frame sequence number.

### Read a frame

```ts
const frame = engine.getFrame();
```

A frame contains:

```ts
type FrameSnapshot = {
  sequence: number;
  timestampNs: number;
  projectedPOIs: readonly ProjectedPOI[];
  visiblePOIs: readonly ProjectedPOI[];
};
```

`projectedPOIs`:

- preserves stable POI-index order;
- includes every POI inside `datasetRadiusMeters`;
- includes visible, offscreen, behind-camera and distance-clipped entries;
- supports labels and edge indicators without a second JavaScript projection pass.

`visiblePOIs`:

- contains only currently visible entries;
- is capped by `maxVisiblePOIs`;
- is sorted far-to-near by depth;
- is used by native picking.

Distance clipping is reported separately:

```text
clippedByDistance = "min" | "max" | null
```

This allows the UI to distinguish:

- too close;
- too far;
- offscreen;
- behind camera;
- visible.

### Pick a visible POI

```ts
const result = engine.pick(screenX, screenY, 32);
```

Picking searches the current `visiblePOIs` frame and returns the POI with the smallest screen-space distance inside the requested pixel radius.

### Dispose

```ts
engine.dispose();
```

Disposal is idempotent. The TypeScript wrapper throws if other methods are called after disposal.

## Android build integration

The native Android integration is generated by:

```text
plugins/withCumquatNative.js
```

The plugin:

1. Adds an `externalNativeBuild` CMake entry to `android/app/build.gradle`.
2. Creates `android/app/src/main/jni/OnLoad.cpp`.
3. Registers `NativeCumquatModule` in the C++ module provider.
4. Creates `android/app/src/main/jni/CMakeLists.txt`.
5. Points that CMake file back to `modules/cumquat-native/cpp/`.
6. Enables C++20.

The Android build currently compiles:

```text
cpp/bridge/NativeCumquatModule.cpp
cpp/core/Engine.cpp
cpp/geo/Geodesy.cpp
cpp/projection/Projection.cpp
```

React Native Codegen generates headers such as:

```text
NativeCumquatSpecJSI.h
```

Generated Codegen headers should not be committed or edited manually.

## Generated files

After prebuild, these files appear:

```text
android/app/src/main/jni/
├── CMakeLists.txt
└── OnLoad.cpp
```

They are generated integration files, not canonical source files.

Do not make persistent changes there. This command deletes and recreates them:

```bash
EAS_BUILD_PROFILE=preview \
npx expo prebuild --clean --platform android
```

Any lasting native integration change must be implemented in:

```text
plugins/withCumquatNative.js
```

Any lasting engine change must be implemented in:

```text
modules/cumquat-native/cpp/
```

## Development workflow

### List native source files

```bash
find modules/cumquat-native/cpp \
  -type f \( -name '*.cpp' -o -name '*.h' -o -name '*.hpp' \) \
  | sort
```

### Validate JavaScript and integration tests

```bash
npm test -- --runInBand
```

The Jest suite validates the TypeScript integration and mocks the native engine. It does not replace compiling and running the actual C++ module.

### Regenerate Android integration

```bash
EAS_BUILD_PROFILE=preview \
npx expo prebuild --clean --platform android
```

### Compile and run locally

```bash
EAS_BUILD_PROFILE=preview \
npx expo run:android
```

A successful prebuild only proves that the native project was generated. `expo run:android` or an EAS Build is required to verify the C++ compilation and final native linkage.

### Build the preview APK

```bash
eas build --platform android --profile preview
```

## Native changes and EAS Update

Changes to these files require a new Android build:

```text
modules/cumquat-native/cpp/**
modules/cumquat-native/specs/**
plugins/withCumquatNative.js
native dependencies
Android build configuration
```

They cannot be delivered safely through `eas update` because an OTA update replaces JavaScript and bundled assets, not the compiled C++ library or generated TurboModule registration.

Pure TypeScript/UI changes can use EAS Update only when they remain compatible with the native runtime already installed in the APK.

## Performance model

The engine is designed around these rules:

- Initialize the dataset once.
- Keep projection state in C++.
- Apply the immutable hard radius before projection and serialization.
- Update FOV and gesture distance limits without recreating the engine.
- Return both full projected state and a visible-only subset.
- Avoid a second JavaScript projection pass.
- Let the React layer commit only meaningful frame changes.

The hard radius is intentionally separate from the gesture-controlled distance range:

```text
datasetRadiusMeters
    immutable native query boundary

minDistanceMeters / maxDistanceMeters
    mutable presentation and gesture clipping range
```

A POI beyond the hard radius does not enter a frame. A POI inside the hard radius but outside the current gesture range remains in `projectedPOIs` with `clippedByDistance` set, so an edge indicator can still be rendered.

## Common changes

### Add a new engine configuration option

Update all relevant layers:

1. `src/types.ts`
2. `cpp/core/Types.h`
3. parsing in `cpp/bridge/NativeCumquatModule.cpp`
4. behavior in `cpp/core/Engine.cpp`
5. tests and this README

### Add a new method

Update:

1. `specs/NativeCumquat.ts`
2. `src/CumquatEngine.ts`
3. `cpp/bridge/NativeCumquatModule.h`
4. `cpp/bridge/NativeCumquatModule.cpp`
5. core implementation as needed
6. regenerate and rebuild native code

### Change a returned frame field

Keep these synchronized:

```text
cpp/core/Types.h
cpp/bridge/NativeCumquatModule.cpp
src/types.ts
application consumers
tests
```

### Change projection behavior

Projection math belongs in:

```text
cpp/projection/Projection.cpp
```

Geographic conversions and bearings belong in:

```text
cpp/geo/Geodesy.cpp
```

Frame policy, hard-radius filtering, distance clipping and picking belong in:

```text
cpp/core/Engine.cpp
```

JSI conversion belongs in:

```text
cpp/bridge/NativeCumquatModule.cpp
```

Keeping these boundaries intact makes the engine easier to test and eventually extract into a standalone package.

## Troubleshooting

### `NativeCumquat` is not found at runtime

Check that:

- the app was rebuilt after native changes;
- `./plugins/withCumquatNative` is present in `app.config.ts`;
- prebuild generated `android/app/src/main/jni/OnLoad.cpp`;
- `OnLoad.cpp` includes `NativeCumquatModule.h`;
- the provider returns `NativeCumquatModule` for the correct module name;
- React Native Codegen ran successfully.

### CMake cannot find a source file

Inspect:

```text
android/app/src/main/jni/CMakeLists.txt
```

Then fix path generation in:

```text
plugins/withCumquatNative.js
```

Do not fix only the generated CMake file.

### Changes disappear after `prebuild --clean`

The edited file was probably generated. Move the change into the config plugin or the canonical C++ source tree.

### JavaScript works but native behavior did not change

The device may still have an older APK. C++ changes require a new native build and reinstall; publishing an EAS Update is not enough.

### Invalid POI index from a native frame

`poiIndex` refers to the original array passed to `initialize()`. Keep that array stable for the lifetime of the engine and map frame entries against the same dataset.

## Maintenance rules

- Edit canonical C++ only under `modules/cumquat-native/cpp/`.
- Keep native and TypeScript types synchronized.
- Do not add app UI or gesture policy to the bridge.
- Do not recreate the engine for ordinary view-state changes.
- Dispose every engine instance on unmount.
- Rebuild the APK after native or Codegen changes.
- Treat `android/app/src/main/jni/` as generated output.
- Keep `plugins/withCumquatNative.js` idempotent because prebuild may run repeatedly.
