import {sensorHub} from "@/cumquat/sensors";
import type {Quat, SensorSnapshot} from "@/cumquat/types";

/**
 * The original AR projection was tuned for the opposite landscape side.
 *
 * On the Galaxy S7 the app is used with portrait rotated counter-clockwise:
 * the physical Home button is on the right. The two landscape device frames
 * differ by 180 degrees around the camera/screen normal, so both in-screen
 * sensor axes must be inverted while the camera-facing axis stays unchanged.
 */
export function remapQuaternionToHomeButtonRight(q: Quat): Quat {
  // qCorrected = rotationZ(180deg) * q
  // rotationZ(180deg) = {x: 0, y: 0, z: 1, w: 0}
  return {
    x: -q.y,
    y: q.x,
    z: q.w,
    w: -q.z,
  };
}

let installed = false;

/**
 * Installs one idempotent correction at the SensorHub boundary so both the
 * native C++ engine and the JavaScript fallback receive the same orientation.
 */
export function installHomeButtonRightOrientation(): void {
  if (installed) return;
  installed = true;

  const originalGetSnapshot = sensorHub.getSnapshot.bind(sensorHub);

  sensorHub.getSnapshot = (): SensorSnapshot => {
    const snapshot = originalGetSnapshot();

    return {
      ...snapshot,
      orientation: remapQuaternionToHomeButtonRight(snapshot.orientation),
    };
  };
}
