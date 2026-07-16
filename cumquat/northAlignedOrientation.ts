import {sensorHub} from "@/cumquat/sensors";
import type {Quat, SensorSnapshot} from "@/cumquat/types";

/**
 * Expo DeviceMotion reports all axes in the phone's natural portrait frame.
 * The app is intentionally used in LeftLandscape: portrait rotated
 * counter-clockwise, with the physical Home button on the right.
 */
export const CAMERA_SCREEN_ORIENTATION_DEGREES = -90;

const IDENTITY_QUATERNION: Quat = {x: 0, y: 0, z: 0, w: 1};

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

/** Returns the signed shortest rotation from `from` to `to`. */
function shortestAngleDegrees(from: number, to: number): number {
  if (!Number.isFinite(from) || !Number.isFinite(to)) return 0;
  return ((to - from + 540) % 360) - 180;
}

/**
 * Produces the only orientation consumed by AR.
 *
 * DeviceMotion's Android rotation vector is gravity- and magnetic-north-aware,
 * but its axes are expressed in portrait coordinates. We first rotate its
 * output frame into the active landscape screen frame.
 *
 * Expo Location calculates true heading by adding geomagnetic declination to
 * magnetic heading. Their difference is independent of how the phone is held,
 * so it is safe to apply that difference as a world-Z correction without
 * replacing DeviceMotion's pitch, roll, or smooth fused yaw.
 *
 * Matrix order:
 *   screenFromPortrait * motionFromMagneticWorld * magneticFromTrueWorld
 */
export function createNorthAlignedCameraQuaternion(
  motionOrientation: Quat,
  screenOrientationDegrees: number,
  magneticHeading: number,
  trueHeading: number | null,
): Quat {
  const portraitToScreen = zRotationQuaternion(-screenOrientationDegrees);
  const declinationDegrees =
    trueHeading === null
      ? 0
      : shortestAngleDegrees(magneticHeading, trueHeading);
  const magneticToTrueNorth = zRotationQuaternion(declinationDegrees);

  return normalizeQuaternion(
    multiplyQuaternions(
      multiplyQuaternions(portraitToScreen, motionOrientation),
      magneticToTrueNorth,
    ),
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

    return {
      ...snapshot,
      orientation: createNorthAlignedCameraQuaternion(
        snapshot.orientation,
        CAMERA_SCREEN_ORIENTATION_DEGREES,
        snapshot.magneticHeading,
        snapshot.trueHeading,
      ),
    };
  };
}
