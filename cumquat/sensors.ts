// sensors.ts - sensor hub and math utilities for Cumquat AR
import { DeviceMotion } from "expo-sensors";
import * as Location from "expo-location";
import { Tlog, Slog, Rlog, Plog } from "@/utils/tlog";
import { AR_CONSTANTS } from "@/cumquat/constants";
import { Quat, Vec3, ScreenPosition, SensorSnapshot } from "./types";

const { DEG2RAD, RAD2DEG, WGS84_F, WGS84_A } = AR_CONSTANTS;
const WGS84_E2 = WGS84_F * (2 - WGS84_F);

// ============ QUATERNION MATH ============

function inverse(q: Quat): Quat {
  // For unit quaternion, inverse is conjugate
  const norm = Math.hypot(q.x, q.y, q.z, q.w);
  if (norm === 0) return { x: 0, y: 0, z: 0, w: 1 };
  return {
    x: -q.x / norm,
    y: -q.y / norm,
    z: -q.z / norm,
    w: q.w / norm,
  };
}

function rotateVector(v: Vec3, q: Quat): Vec3 {
  // Extract quaternion components
  const { x: qx, y: qy, z: qz, w: qw } = q;
  const { x: vx, y: vy, z: vz } = v;

  // Compute quaternion * vector * conjugate
  // This is the standard formula: v' = q * v * q^-1

  // t = 2 * cross(q.xyz, v)
  const tx = 2 * (qy * vz - qz * vy);
  const ty = 2 * (qz * vx - qx * vz);
  const tz = 2 * (qx * vy - qy * vx);

  // v' = v + q.w * t + cross(q.xyz, t)
  const result = {
    x: vx + qw * tx + (qy * tz - qz * ty),
    y: vy + qw * ty + (qz * tx - qx * tz),
    z: vz + qw * tz + (qx * ty - qy * tx),
  };

  return result;
}

// ============ SENSOR HUB ============

class SensorHub {
  private snapshot: SensorSnapshot = {
    lat: 0,
    lon: 0,
    elevation: 0,
    orientation: { x: 0, y: 0, z: 0, w: 1 },
    timestamp: 0,
  };
  private deviceMotionSub: any = null;
  private locationWatch: any = null;

  async start() {
    await this.startDeviceMotion();
    await this.startLocation();
    Tlog("✅ SensorHub started");
  }

  getSnapshot(): SensorSnapshot {
    return { ...this.snapshot };
  }

  stop() {
    this.deviceMotionSub?.remove();
    this.locationWatch?.remove();
  }

  private async startDeviceMotion() {
    await DeviceMotion.requestPermissionsAsync();
    DeviceMotion.setUpdateInterval(16);
    this.deviceMotionSub = DeviceMotion.addListener((motion) => {
      if (!motion.rotation) return;

      const rot = motion.rotation as any;
      let orientation: Quat;

      if (rot.qx !== undefined) {
        orientation = { x: rot.qx, y: rot.qy, z: rot.qz, w: rot.qw };
      } else if (rot.alpha !== undefined) {
        // CORRECTED Euler to Quaternion conversion
        // DeviceMotion uses: alpha (yaw), beta (pitch), gamma (roll)
        // Order: Z (yaw), X (pitch), Y (roll) - common for mobile devices
        const yaw = rot.alpha; // Z-axis rotation
        const pitch = rot.beta; // X-axis rotation
        const roll = rot.gamma; // Y-axis rotation

        const cy = Math.cos(yaw * 0.5);
        const sy = Math.sin(yaw * 0.5);
        const cp = Math.cos(pitch * 0.5);
        const sp = Math.sin(pitch * 0.5);
        const cr = Math.cos(roll * 0.5);
        const sr = Math.sin(roll * 0.5);

        // Correct order: Z * X * Y (yaw * pitch * roll)
        orientation = {
          w: cy * cp * cr + sy * sp * sr,
          x: cy * sp * cr + sy * cp * sr,
          y: sy * cp * cr - cy * sp * sr,
          z: cy * cp * sr - sy * sp * cr,
        };
      } else {
        return;
      }

      this.snapshot.orientation = orientation;
      this.snapshot.timestamp = Date.now();
    });
  }

  private async startLocation() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return;

    this.locationWatch = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 1000,
        distanceInterval: 1,
      },
      (pos) => {
        this.snapshot.lat = pos.coords.latitude;
        this.snapshot.lon = pos.coords.longitude;
        this.snapshot.elevation = pos.coords.altitude ?? 0;
      },
    );
  }
}

const sensorHub = new SensorHub();

// ============ GEO MATH ============

function geoToENU(
  lat1: number,
  lon1: number,
  alt1: number,
  lat2: number,
  lon2: number,
  alt2: number,
): Vec3 {
  // Validate inputs
  if (isNaN(lat2) || isNaN(lon2)) {
    Tlog(`Invalid POI coordinates: lat=${lat2}, lon=${lon2}`);
    return { x: 0, y: 0, z: 0 };
  }
  const φ1 = lat1 * DEG2RAD;
  const λ1 = lon1 * DEG2RAD;
  const φ2 = lat2 * DEG2RAD;
  const λ2 = lon2 * DEG2RAD;

  const sinφ1 = Math.sin(φ1);
  const cosφ1 = Math.cos(φ1);
  const N = WGS84_A / Math.sqrt(1 - WGS84_E2 * sinφ1 * sinφ1);

  // User ECEF
  const userX = (N + alt1) * cosφ1 * Math.cos(λ1);
  const userY = (N + alt1) * cosφ1 * Math.sin(λ1);
  const userZ = (N * (1 - WGS84_E2) + alt1) * sinφ1;

  // POI ECEF
  const sinφ2 = Math.sin(φ2);
  const cosφ2 = Math.cos(φ2);
  const N2 = WGS84_A / Math.sqrt(1 - WGS84_E2 * sinφ2 * sinφ2);
  const poiX = (N2 + alt2) * cosφ2 * Math.cos(λ2);
  const poiY = (N2 + alt2) * cosφ2 * Math.sin(λ2);
  const poiZ = (N2 * (1 - WGS84_E2) + alt2) * sinφ2;

  // Delta ECEF
  const dx = poiX - userX;
  const dy = poiY - userY;
  const dz = poiZ - userZ;

  // Transform to ENU (local East, North, Up)
  // These values should be in meters, typically small (0-50000)
  const east = -Math.sin(λ1) * dx + Math.cos(λ1) * dy;
  const north =
    -Math.sin(φ1) * Math.cos(λ1) * dx -
    Math.sin(φ1) * Math.sin(λ1) * dy +
    Math.cos(φ1) * dz;
  const up =
    Math.cos(φ1) * Math.cos(λ1) * dx +
    Math.cos(φ1) * Math.sin(λ1) * dy +
    Math.sin(φ1) * dz;

  return { x: east, y: north, z: up };
}

// ============ BEARING CALCULATION ============

function calculateBearing(
  userLat: number,
  userLon: number,
  poiLat: number,
  poiLon: number,
): number {
  const φ1 = userLat * DEG2RAD;
  const φ2 = poiLat * DEG2RAD;
  const Δλ = (poiLon - userLon) * DEG2RAD;

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

  let bearing = Math.atan2(y, x) * RAD2DEG;
  bearing = (bearing + 360) % 360; // Normalize to 0-360

  return bearing;
}

// ============ PROJECTION ============

function projectToScreen(
  cameraPos: Vec3,
  width: number,
  height: number,
  fov: number,
): ScreenPosition {
  const depth = -cameraPos.z;

  if (depth <= 0.1) {
    return {
      x: 0,
      y: 0,
      visible: false,
      clipped: true,
      clippedByDistance: null,
      depth: depth,
    };
  }

  // Swap X and Y with negation - from working quat.js
  const correctedX = -cameraPos.y;
  const correctedY = -cameraPos.x;

  // FOV in degrees, convert to radians
  const fovRad = (fov * Math.PI) / 180;

  // Calculate focal length correctly
  // For perspective projection: screen_coord = (camera_coord / depth) * focal_length
  // focal_length = (screen_width/2) / tan(fov/2)
  const focalLength = width / 2 / Math.tan(fovRad / 2);

  // Project to NDC then to screen coordinates
  const screenX = width / 2 + (correctedX / depth) * focalLength;
  const screenY = height / 2 - (correctedY / depth) * focalLength; // Y is inverted in screen space

  // Check if within screen bounds (with margin)
  const margin = 200;
  const visible =
    screenX >= -margin &&
    screenX <= width + margin &&
    screenY >= -margin &&
    screenY <= height + margin;

  return {
    x: screenX,
    y: screenY,
    visible,
    clipped: !visible,
    clippedByDistance: null,
    depth: depth,
  };
}

/**
 * Project a camera-space position to screen coordinates with distance clipping
 *
 * @param cameraPos - Position in camera space (from rotateVector)
 * @param trueDistance - Actual Euclidean distance from user to POI (meters)
 * @param width - Screen width in pixels
 * @param height - Screen height in pixels
 * @param fov - Field of view in degrees
 * @param minDistance - Minimum visible RADIAL distance (meters)
 * @param maxDistance - Maximum visible RADIAL distance (meters)
 * @returns ScreenPosition with clipping information
 */
function projectToScreenWithClipping(
  cameraPos: Vec3,
  trueDistance: number, // ← NEW: pass true distance separately
  width: number,
  height: number,
  fov: number,
  minDistance: number,
  maxDistance: number,
): ScreenPosition {
  // Use TRUE DISTANCE for radial clipping
  if (trueDistance < minDistance) {
    return {
      x: 0,
      y: 0,
      visible: false,
      clipped: true,
      clippedByDistance: "min",
      depth: cameraPos.z,
    };
  }

  if (trueDistance > maxDistance) {
    return {
      x: 0,
      y: 0,
      visible: false,
      clipped: true,
      clippedByDistance: "max",
      depth: cameraPos.z,
    };
  }

  // Use PROJECTION DEPTH for perspective projection
  const depth = cameraPos.z;

  // Check if behind camera
  if (depth <= 0.1) {
    return {
      x: 0,
      y: 0,
      visible: false,
      clipped: true,
      clippedByDistance: null,
      depth: depth,
    };
  }

  // Project to screen
  const correctedX = -cameraPos.y;
  const correctedY = -cameraPos.x;

  const fovRad = (fov * Math.PI) / 180;
  const focalLength = width / 2 / Math.tan(fovRad / 2);

  const screenX = width / 2 + (correctedX / depth) * focalLength;
  const screenY = height / 2 - (correctedY / depth) * focalLength;

  // Check screen bounds
  const margin = 200;
  const visible =
    screenX >= -margin &&
    screenX <= width + margin &&
    screenY >= -margin &&
    screenY <= height + margin;

  return {
    x: screenX,
    y: screenY,
    visible: visible,
    clipped: !visible,
    clippedByDistance: null,
    depth: depth,
    radialDistance: trueDistance,
  };
}

// ============ EXPORTS ============

export {
  sensorHub,
  geoToENU,
  projectToScreen,
  projectToScreenWithClipping,
  inverse,
  rotateVector,
  calculateBearing,
};
