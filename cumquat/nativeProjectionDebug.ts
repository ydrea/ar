import type {Quat, ScreenPosition, SensorSnapshot, Vec3} from "./types";

type NativeVisiblePOI = {
  poiIndex: number;
  x: number;
  y: number;
  depth: number;
  distance: number;
  bearing: number;
  visible: boolean;
};

type NativeFrame = {
  sequence: number;
  timestampNs: number;
  visiblePOIs: readonly NativeVisiblePOI[];
};

type EngineLike = {
  initialize(
    pois: readonly {
      id: string;
      name?: string;
      latitude: number;
      longitude: number;
      altitude: number;
    }[],
  ): void;
  update(sensorState: {
    timestampNs: number;
    location: {latitude: number; longitude: number; altitude: number};
    headingDegrees: number;
    pitchDegrees: number;
    rollDegrees: number;
    viewportWidth: number;
    viewportHeight: number;
  }): number;
  getFrame(): NativeFrame;
  dispose(): void;
};

type RegisteredPOI = {
  key: string;
  latitude: number;
  longitude: number;
  altitude: number;
};

type ProjectionParameters = {
  trueDistance: number;
  width: number;
  height: number;
  fov: number;
  minDistance: number;
  maxDistance: number;
};

type FrameStats = {
  sequence: number;
  expected: number;
  seen: Set<number>;
  jsVisible: number;
  nativeVisible: number;
  matched: number;
  totalDelta: number;
  maxDelta: number;
  samples: string[];
  emitted: boolean;
  heading: number;
  pitch: number;
  roll: number;
};

const DEBUG_ENABLED =
  (typeof __DEV__ === "undefined" || __DEV__) &&
  !(typeof process !== "undefined" && process.env.NODE_ENV === "test");

const worldVectorIndexes = new WeakMap<object, number>();
const cameraVectorIndexes = new WeakMap<object, number>();

let registeredPOIs: RegisteredPOI[] = [];
let firstPOIKey: string | null = null;
let observer = {latitude: 0, longitude: 0, altitude: 0};
let snapshot: SensorSnapshot | null = null;
let lastOrientation: Quat = {x: 0, y: 0, z: 0, w: 1};

let engine: EngineLike | null = null;
let engineSignature = "";
let nativeFrameKey = "";
let nativeFrame: NativeFrame | null = null;
let nativeByIndex = new Map<number, NativeVisiblePOI>();
let stats: FrameStats | null = null;
let lastLogAt = 0;
let loadFailed = false;

function poiKey(latitude: number, longitude: number, altitude: number): string {
  return `${latitude.toFixed(9)},${longitude.toFixed(9)},${altitude.toFixed(3)}`;
}

function normalizeDegrees(value: number): number {
  return ((value % 360) + 360) % 360;
}

function quaternionToEulerDegrees(q: Quat): {
  heading: number;
  pitch: number;
  roll: number;
} {
  const norm = Math.hypot(q.x, q.y, q.z, q.w) || 1;
  const x = q.x / norm;
  const y = q.y / norm;
  const z = q.z / norm;
  const w = q.w / norm;

  const roll = Math.atan2(
    2 * (w * x + y * z),
    1 - 2 * (x * x + y * y),
  );
  const pitchInput = Math.max(-1, Math.min(1, 2 * (w * y - z * x)));
  const pitch = Math.asin(pitchInput);
  const heading = Math.atan2(
    2 * (w * z + x * y),
    1 - 2 * (y * y + z * z),
  );

  const radiansToDegrees = 180 / Math.PI;
  return {
    heading: normalizeDegrees(heading * radiansToDegrees),
    pitch: pitch * radiansToDegrees,
    roll: roll * radiansToDegrees,
  };
}

function loadEngineFactory():
  | {
      create(config: {
        horizontalFovDegrees: number;
        nearMeters: number;
        farMeters: number;
        maxVisiblePOIs: number;
      }): EngineLike;
      getNativeVersion(): string;
    }
  | null {
  if (!DEBUG_ENABLED || loadFailed) return null;

  try {
    const nativePackage = require("@/modules/cumquat-native/src") as {
      CumquatEngine: {
        create(config: {
          horizontalFovDegrees: number;
          nearMeters: number;
          farMeters: number;
          maxVisiblePOIs: number;
        }): EngineLike;
        getNativeVersion(): string;
      };
    };
    return nativePackage.CumquatEngine;
  } catch (error) {
    loadFailed = true;
    console.warn("🟠 C++ projection comparison disabled:", error);
    return null;
  }
}

function currentPOISignature(): string {
  return registeredPOIs.map((poi) => poi.key).join("|");
}

function ensureEngine(parameters: ProjectionParameters): boolean {
  if (!DEBUG_ENABLED || registeredPOIs.length === 0) return false;

  const nearMeters = Math.max(0.001, parameters.minDistance);
  const farMeters = Math.max(nearMeters + 0.001, parameters.maxDistance);
  const signature = [
    currentPOISignature(),
    parameters.fov.toFixed(4),
    nearMeters.toFixed(4),
    farMeters.toFixed(4),
  ].join("::");

  if (engine && signature === engineSignature) return true;

  engine?.dispose();
  engine = null;
  nativeFrame = null;
  nativeByIndex = new Map();
  nativeFrameKey = "";
  stats = null;

  const factory = loadEngineFactory();
  if (!factory) return false;

  try {
    engine = factory.create({
      horizontalFovDegrees: parameters.fov,
      nearMeters,
      farMeters,
      maxVisiblePOIs: Math.max(1, registeredPOIs.length),
    });
    engine.initialize(
      registeredPOIs.map((poi, index) => ({
        id: String(index),
        name: poi.key,
        latitude: poi.latitude,
        longitude: poi.longitude,
        altitude: poi.altitude,
      })),
    );
    engineSignature = signature;
    console.log(
      `🧪 C++ projection debug initialized: ${registeredPOIs.length} POIs (${factory.getNativeVersion()})`,
    );
    return true;
  } catch (error) {
    console.error("🔴 C++ projection debug initialization failed:", error);
    engine?.dispose();
    engine = null;
    engineSignature = "";
    return false;
  }
}

function updateNativeFrame(parameters: ProjectionParameters): boolean {
  if (!ensureEngine(parameters) || !engine) return false;

  const currentSnapshot = snapshot;
  const orientation = currentSnapshot?.orientation ?? lastOrientation;
  const timestamp = currentSnapshot?.timestamp ?? 0;
  const location = currentSnapshot
    ? {
        latitude: currentSnapshot.lat,
        longitude: currentSnapshot.lon,
        altitude: currentSnapshot.elevation,
      }
    : observer;

  if (location.latitude === 0 && location.longitude === 0) return false;

  const frameKey = [
    timestamp,
    location.latitude.toFixed(9),
    location.longitude.toFixed(9),
    location.altitude.toFixed(3),
    orientation.x.toFixed(6),
    orientation.y.toFixed(6),
    orientation.z.toFixed(6),
    orientation.w.toFixed(6),
    parameters.width,
    parameters.height,
    parameters.fov.toFixed(4),
    parameters.minDistance.toFixed(3),
    parameters.maxDistance.toFixed(3),
  ].join("|");

  if (frameKey === nativeFrameKey && nativeFrame) return true;

  const euler = quaternionToEulerDegrees(orientation);

  try {
    engine.update({
      timestampNs: timestamp * 1_000_000,
      location,
      headingDegrees: euler.heading,
      pitchDegrees: euler.pitch,
      rollDegrees: euler.roll,
      viewportWidth: parameters.width,
      viewportHeight: parameters.height,
    });
    nativeFrame = engine.getFrame();
    nativeByIndex = new Map(
      nativeFrame.visiblePOIs.map((poi) => [poi.poiIndex, poi]),
    );
    nativeFrameKey = frameKey;
    stats = {
      sequence: nativeFrame.sequence,
      expected: registeredPOIs.length,
      seen: new Set(),
      jsVisible: 0,
      nativeVisible: nativeFrame.visiblePOIs.length,
      matched: 0,
      totalDelta: 0,
      maxDelta: 0,
      samples: [],
      emitted: false,
      heading: euler.heading,
      pitch: euler.pitch,
      roll: euler.roll,
    };
    return true;
  } catch (error) {
    console.error("🔴 C++ projection update failed:", error);
    return false;
  }
}

function emitStatsIfComplete(): void {
  if (!stats || stats.emitted || stats.seen.size < stats.expected) return;
  stats.emitted = true;

  const now = Date.now();
  if (now - lastLogAt < 1_000) return;
  lastLogAt = now;

  const meanDelta = stats.matched > 0 ? stats.totalDelta / stats.matched : 0;
  console.log(
    `🧪 C++ vs JS frame ${stats.sequence}: native ${stats.nativeVisible}/${stats.expected}, JS ${stats.jsVisible}/${stats.expected}, matched ${stats.matched}, mean Δ ${meanDelta.toFixed(1)}px, max Δ ${stats.maxDelta.toFixed(1)}px, H/P/R ${stats.heading.toFixed(1)}/${stats.pitch.toFixed(1)}/${stats.roll.toFixed(1)}`,
  );
  stats.samples.forEach((sample) => console.log(sample));
}

export const nativeProjectionDebug = {
  setSensorSnapshot(nextSnapshot: SensorSnapshot): void {
    if (!DEBUG_ENABLED) return;
    snapshot = {
      ...nextSnapshot,
      orientation: {...nextSnapshot.orientation},
    };
  },

  registerGeo(
    vector: Vec3,
    sourceLatitude: number,
    sourceLongitude: number,
    sourceAltitude: number,
    targetLatitude: number,
    targetLongitude: number,
    targetAltitude: number,
  ): void {
    if (!DEBUG_ENABLED) return;

    const key = poiKey(targetLatitude, targetLongitude, targetAltitude);
    if (registeredPOIs.length > 0 && key === firstPOIKey) {
      registeredPOIs = [];
      firstPOIKey = null;
    }

    if (registeredPOIs.length === 0) firstPOIKey = key;

    const index = registeredPOIs.length;
    registeredPOIs.push({
      key,
      latitude: targetLatitude,
      longitude: targetLongitude,
      altitude: targetAltitude,
    });
    worldVectorIndexes.set(vector, index);
    observer = {
      latitude: sourceLatitude,
      longitude: sourceLongitude,
      altitude: sourceAltitude,
    };
  },

  registerRotation(source: Vec3, result: Vec3, orientation: Quat): void {
    if (!DEBUG_ENABLED) return;
    const index = worldVectorIndexes.get(source);
    if (index === undefined) return;
    cameraVectorIndexes.set(result, index);
    lastOrientation = {...orientation};
  },

  compareProjection(
    cameraPosition: Vec3,
    jsProjection: ScreenPosition,
    parameters: ProjectionParameters,
  ): ScreenPosition {
    if (!DEBUG_ENABLED) return jsProjection;

    const poiIndex = cameraVectorIndexes.get(cameraPosition);
    if (poiIndex === undefined || !updateNativeFrame(parameters) || !stats) {
      return jsProjection;
    }

    if (!stats.seen.has(poiIndex)) {
      stats.seen.add(poiIndex);
      const jsVisible =
        jsProjection.visible && jsProjection.clippedByDistance == null;
      if (jsVisible) stats.jsVisible += 1;

      const nativeProjection = nativeByIndex.get(poiIndex);
      if (jsVisible && nativeProjection) {
        const delta = Math.hypot(
          nativeProjection.x - jsProjection.x,
          nativeProjection.y - jsProjection.y,
        );
        stats.matched += 1;
        stats.totalDelta += delta;
        stats.maxDelta = Math.max(stats.maxDelta, delta);

        if (stats.samples.length < 4) {
          stats.samples.push(
            `  ↳ #${poiIndex} JS(${jsProjection.x.toFixed(0)},${jsProjection.y.toFixed(0)}) C++(${nativeProjection.x.toFixed(0)},${nativeProjection.y.toFixed(0)}) Δ${delta.toFixed(1)}px`,
          );
        }
      }
    }

    emitStatsIfComplete();
    return jsProjection;
  },

  dispose(): void {
    engine?.dispose();
    engine = null;
    engineSignature = "";
    nativeFrameKey = "";
    nativeFrame = null;
    nativeByIndex = new Map();
    stats = null;
  },
};
