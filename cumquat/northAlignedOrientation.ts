import {sensorHub} from "@/cumquat/sensors";
import type {Quat, SensorSnapshot} from "@/cumquat/types";

const IDENTITY_QUATERNION: Quat = {x: 0, y: 0, z: 0, w: 1};

function normalizeHeading(degrees: number): number {
  return ((degrees % 360) + 360) % 360;
}

export function cameraHeadingForScreen(
  portraitHeading: number,
  screenOrientationDegrees: number,
): number {
  if (!Number.isFinite(portraitHeading)) return 0;
  return normalizeHeading(portraitHeading + screenOrientationDegrees);
}

function normalizeQuaternion(q: Quat): Quat {
  const length = Math.hypot(q.x, q.y, q.z, q.w);
  if (!Number.isFinite(length) || length <= Number.EPSILON) {
    return {...IDENTITY_QUATERNION};
  }

  return {
    x: q.x / length,
    y: q.y / length,
    z: q.z / length,
    w: q.w / length,
  };
}

/** Hamilton product. Applying the result rotates by right first, then left. */
function multiplyQuaternions(left: Quat, right: Quat): Quat {
  return {
    x:
      left.w * right.x +
      left.x * right.w +
      left.y * right.z -
      left.z * right.y,
    y:
      left.w * right.y -
      left.x * right.z +
      left.y * right.w +
      left.z * right.x,
    z:
      left.w * right.z +
      left.x * right.y -
      left.y * right.x +
      left.z * right.w,
    w:
      left.w * right.w -
      left.x * right.x -
      left.y * right.y -
      left.z * right.z,
  };
}

function zRotationQuaternion(degrees: number): Quat {
  const halfRadians = (degrees * Math.PI) / 360;
  return {
    x: 0,
    y: 0,
    z: Math.sin(halfRadians),
    w: Math.cos(halfRadians),
  };
}

function inverseUnitQuaternion(q: Quat): Quat {
  return {x: -q.x, y: -q.y, z: -q.z, w: q.w};
}

function rotateVector(
  vector: {x: number; y: number; z: number},
  q: Quat,
): {x: number; y: number; z: number} {
  const tx = 2 * (q.y * vector.z - q.z * vector.y);
  const ty = 2 * (q.z * vector.x - q.x * vector.z);
  const tz = 2 * (q.x * vector.y - q.y * vector.x);

  return {
    x: vector.x + q.w * tx + (q.y * tz - q.z * ty),
    y: vector.y + q.w * ty + (q.z * tx - q.x * tz),
    z: vector.z + q.w * tz + (q.x * ty - q.y * tx),
  };
}

function cameraForwardBearing(orientation: Quat): number | null {
  const worldForward = rotateVector(
    {x: 0, y: 0, z: -1},
    inverseUnitQuaternion(orientation),
  );
  const horizontalLength = Math.hypot(worldForward.x, worldForward.y);

  if (horizontalLength < 1e-6) return null;

  return (
    (Math.atan2(worldForward.x, worldForward.y) * 180) / Math.PI +
    360
  ) % 360;
}

function shortestAngleDegrees(from: number, to: number): number {
  return ((to - from + 540) % 360) - 180;
}

/**
 * Produces the only orientation consumed by AR.
 *
 * Expo DeviceMotion expresses its axes in the natural portrait frame and also
 * reports the active screen rotation as 0, 90, 180 or -90 degrees. Rotating by
 * that live value supports both landscape directions on Android, iPhone and
 * iPad instead of assuming a fixed home-button side.
 *
 * DeviceMotion supplies smooth pitch and roll, but its yaw reference is not
 * guaranteed to match Expo Location heading on every Android device. Infer the
 * quaternion's current horizontal forward bearing and rotate its world-Z input
 * so camera-forward equals the live compass heading. This preserves gravity,
 * pitch and roll while making geographic POI bearings authoritative.
 *
 * Matrix order:
 *   screenFromPortrait * motionFromWorld * worldHeadingCorrection
 */
export function createNorthAlignedCameraQuaternion(
  motionOrientation: Quat,
  screenOrientationDegrees: number,
  magneticHeading: number,
  trueHeading: number | null,
): Quat {
  const portraitToScreen = zRotationQuaternion(-screenOrientationDegrees);
  const screenOrientation = normalizeQuaternion(
    multiplyQuaternions(portraitToScreen, motionOrientation),
  );
  const currentBearing = cameraForwardBearing(screenOrientation);
  const targetHeading = trueHeading ?? magneticHeading;

  if (currentBearing === null || !Number.isFinite(targetHeading)) {
    return screenOrientation;
  }

  const headingCorrection = zRotationQuaternion(
    shortestAngleDegrees(currentBearing, targetHeading),
  );

  return normalizeQuaternion(
    multiplyQuaternions(screenOrientation, headingCorrection),
  );
}

let installed = false;

/**
 * Installs the north-alignment once at the SensorHub snapshot boundary.
 * Both the native C++ path and the JavaScript fallback receive the same fused
 * quaternion because both consume the returned SensorSnapshot.
 */
export function installNorthAlignedOrientation(): void {
  if (installed) return;
  installed = true;

  const getRawSnapshot = sensorHub.getSnapshot.bind(sensorHub);

  sensorHub.getSnapshot = (): SensorSnapshot => {
    const snapshot = getRawSnapshot();
    const magneticHeading = cameraHeadingForScreen(
      snapshot.magneticHeading,
      snapshot.screenOrientationDegrees,
    );
    const trueHeading =
      snapshot.trueHeading === null
        ? null
        : cameraHeadingForScreen(
            snapshot.trueHeading,
            snapshot.screenOrientationDegrees,
          );
    const heading = cameraHeadingForScreen(
      snapshot.heading,
      snapshot.screenOrientationDegrees,
    );

    return {
      ...snapshot,
      heading,
      magneticHeading,
      trueHeading,
      orientation: createNorthAlignedCameraQuaternion(
        snapshot.orientation,
        snapshot.screenOrientationDegrees,
        magneticHeading,
        trueHeading,
      ),
    };
  };
}
