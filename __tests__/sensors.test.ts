// __tests__/sensors.test.ts

import {
  geoToENU,
  rotateVector,
  projectToScreen,
  projectToScreenWithClipping,
  calculateBearing,
} from "@/cumquat/sensors";
import { AR_CONSTANTS } from "@/cumquat/constants";

describe("sensors utilities", () => {
  // ============ GEO TO ENU ============

  describe("geoToENU", () => {
    test("returns near-zero for identical coords", () => {
      const p = geoToENU(45.8, 15.96, 120, 45.8, 15.96, 120);
      expect(p.x).toBeCloseTo(0, 2);
      expect(p.y).toBeCloseTo(0, 2);
      expect(p.z).toBeCloseTo(0, 2);
    });

    test("eastward movement produces positive X", () => {
      const p = geoToENU(45.8, 15.96, 0, 45.8, 15.961, 0);
      expect(p.x).toBeGreaterThan(0);
    });

    test("northward movement produces positive Y", () => {
      const p = geoToENU(45.8, 15.96, 0, 45.801, 15.96, 0);
      expect(p.y).toBeGreaterThan(0);
    });

    test("upward movement produces positive Z", () => {
      const p = geoToENU(45.8, 15.96, 0, 45.8, 15.96, 10);
      expect(p.z).toBeGreaterThan(0);
    });

    test("handles invalid POI coordinates gracefully", () => {
      const p = geoToENU(45.8, 15.96, 0, NaN, NaN, 0);
      expect(p.x).toBe(0);
      expect(p.y).toBe(0);
      expect(p.z).toBe(0);
    });
  });

  // ============ ROTATE VECTOR ============

  describe("rotateVector", () => {
    test("identity quaternion preserves vector", () => {
      const v = { x: 3, y: 4, z: 12 };
      const q = { x: 0, y: 0, z: 0, w: 1 };
      const r = rotateVector(v, q);
      expect(r.x).toBeCloseTo(v.x, 5);
      expect(r.y).toBeCloseTo(v.y, 5);
      expect(r.z).toBeCloseTo(v.z, 5);
    });

    test("180 degree yaw flips forward vector", () => {
      const v = { x: 0, y: 0, z: -1 };
      const q = { x: 0, y: 1, z: 0, w: 0 };
      const r = rotateVector(v, q);
      expect(r.z).toBeCloseTo(1, 3);
    });

    test("90 degree pitch rotates vector correctly", () => {
      const v = { x: 0, y: 0, z: -1 };
      const q = { x: 0.7071, y: 0, z: 0, w: 0.7071 };
      const r = rotateVector(v, q);
      // 90 degree pitch should make forward point up (in y)
      expect(r.y).toBeCloseTo(1, 2);
    });
  });

  // ============ PROJECT TO SCREEN ============

  describe("projectToScreen", () => {
    test("returns invisible for behind-camera", () => {
      const res = projectToScreen({ x: 0, y: 0, z: 10 }, 1000, 500, 60);
      expect(res.visible).toBe(false);
      expect(res.clipped).toBe(true);
    });

    test("returns visible for in-front-of-camera", () => {
      const res = projectToScreen({ x: 0, y: 0, z: -10 }, 1000, 500, 60);
      expect(res.visible).toBe(true);
      expect(res.clipped).toBe(false);
    });

    test("centered object projects to screen center", () => {
      const res = projectToScreen({ x: 0, y: 0, z: -10 }, 1000, 500, 60);
      expect(res.visible).toBe(true);
      expect(res.x).toBeCloseTo(500, 1);
      expect(res.y).toBeCloseTo(250, 1);
    });
  });

  // ============ PROJECT TO SCREEN WITH CLIPPING ============

  describe("projectToScreenWithClipping", () => {
    test("visible object is not distance-clipped", () => {
      const res = projectToScreenWithClipping(
        { x: 0, y: 0, z: -10 }, // cameraPos
        10, // trueDistance
        1000, // width
        500, // height
        60, // fov
        1, // minDistance
        100, // maxDistance
      );

      expect(res.clippedByDistance).toBe(null);
      expect(res.depth).toBeCloseTo(10);
      expect(res.visible).toBe(true);
      expect(res.clipped).toBe(false);
    });

    test("too close object is min-clipped", () => {
      const res = projectToScreenWithClipping(
        { x: 0, y: 0, z: -0.05 }, // cameraPos
        0.05, // trueDistance
        1000,
        500,
        60,
        1, // minDistance = 1m
        100,
      );

      expect(res.visible).toBe(false);
      expect(res.clipped).toBe(true);
      expect(res.clippedByDistance).toBe("min");
      expect(res.depth).toBeCloseTo(0.05);
    });

    test("too far object is max-clipped", () => {
      const res = projectToScreenWithClipping(
        { x: 0, y: 0, z: -500 }, // cameraPos
        500, // trueDistance
        1000,
        500,
        60,
        1,
        100, // maxDistance = 100m
      );

      expect(res.visible).toBe(false);
      expect(res.clipped).toBe(true);
      expect(res.clippedByDistance).toBe("max");
      expect(res.depth).toBeCloseTo(500);
    });

    // __tests__/sensors.test.ts - Fix depth expectation

    test("behind-camera object is not distance-clipped", () => {
      const res = projectToScreenWithClipping(
        { x: 0, y: 0, z: 10 }, // cameraPos
        10, // trueDistance
        1000,
        500,
        60,
        1,
        100,
      );

      expect(res.visible).toBe(false);
      expect(res.clipped).toBe(true);
      expect(res.clippedByDistance).toBe(null);
      // Depth is now trueDistance (10) not -cameraPos.z
      expect(res.depth).toBe(10); // Changed from toBeLessThan(0)
    });

    test("offscreen object is not distance-clipped", () => {
      const res = projectToScreenWithClipping(
        { x: 1000, y: 0, z: -10 }, // cameraPos
        10, // trueDistance
        1000,
        500,
        60,
        1,
        100,
      );

      expect(res.visible).toBe(false);
      expect(res.clipped).toBe(true);
      expect(res.clippedByDistance).toBe(null);
    });

    test("just above min is not min-clipped", () => {
      const res = projectToScreenWithClipping(
        { x: 0, y: 0, z: -1.01 }, // cameraPos
        1.01, // trueDistance
        1000,
        500,
        60,
        1, // minDistance = 1m
        100,
      );

      expect(res.clippedByDistance).toBe(null);
      expect(res.visible).toBe(true);
    });

    test("just below max is not max-clipped", () => {
      const res = projectToScreenWithClipping(
        { x: 0, y: 0, z: -99 }, // cameraPos
        99, // trueDistance
        1000,
        500,
        60,
        1,
        100, // maxDistance = 100m
      );

      expect(res.clippedByDistance).toBe(null);
      expect(res.visible).toBe(true);
    });

    test("wider FOV compresses projection toward center", () => {
      const narrow = projectToScreenWithClipping(
        { x: 1, y: 0, z: -10 },
        10,
        1000,
        500,
        30, // narrow FOV
        1,
        100,
      );

      const wide = projectToScreenWithClipping(
        { x: 1, y: 0, z: -10 },
        10,
        1000,
        500,
        90, // wide FOV
        1,
        100,
      );

      expect(narrow.visible).toBe(true);
      expect(wide.visible).toBe(true);
      // Wide FOV should be closer to center
      expect(Math.abs(wide.y - 250)).toBeLessThan(Math.abs(narrow.y - 250));
    });
  });

  // ============ BEARING CALCULATION ============

  describe("calculateBearing", () => {
    test("same point returns 0", () => {
      const bearing = calculateBearing(45.8, 15.96, 45.8, 15.96);
      expect(bearing).toBe(0);
    });

    test("eastward POI returns ~90 degrees", () => {
      const bearing = calculateBearing(45.8, 15.96, 45.8, 15.97);
      expect(bearing).toBeCloseTo(90, 1);
    });

    test("northward POI returns 0 degrees", () => {
      const bearing = calculateBearing(45.8, 15.96, 45.81, 15.96);
      expect(bearing).toBeCloseTo(0, 1);
    });

    test("southward POI returns 180 degrees", () => {
      const bearing = calculateBearing(45.8, 15.96, 45.79, 15.96);
      expect(bearing).toBeCloseTo(180, 1);
    });

    test("westward POI returns 270 degrees", () => {
      const bearing = calculateBearing(45.8, 15.96, 45.8, 15.95);
      expect(bearing).toBeCloseTo(270, 1);
    });

    test("bearing is always between 0 and 360", () => {
      const bearing = calculateBearing(45.8, 15.96, 45.81, 15.97);
      expect(bearing).toBeGreaterThanOrEqual(0);
      expect(bearing).toBeLessThan(360);
    });
  });
});
