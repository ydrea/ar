import {
  geoToENU,
  projectToScreenWithClipping,
  rotateVector,
} from "@/cumquat/sensors";

describe("sensors utilities", () => {
  test("geoToENU returns near-zero for identical coords", () => {
    const p = geoToENU(45.8, 15.96, 120, 45.8, 15.96, 120);
    expect(p.x).toBeCloseTo(0, 2);
    expect(p.y).toBeCloseTo(0, 2);
    expect(p.z).toBeCloseTo(0, 2);
  });

  test("projectToScreenWithClipping - radial too close is clipped (min)", () => {
    const res = projectToScreenWithClipping(
      { x: 0, y: 0, z: -1 },
      1,
      1080,
      1920,
      60,
      2,
      1000,
    );
    expect(res.visible).toBe(false);
    expect(res.clippedByDistance).toBe("min");
  });

  test("projectToScreenWithClipping - radial too far is clipped (max)", () => {
    const res = projectToScreenWithClipping(
      { x: 0, y: 0, z: -100 },
      20000,
      1080,
      1920,
      60,
      2,
      1000,
    );
    expect(res.visible).toBe(false);
    expect(res.clippedByDistance).toBe("max");
  });

  test("rotateVector with identity quaternion preserves length", () => {
    const v = { x: 3, y: 4, z: 12 };
    const q = { x: 0, y: 0, z: 0, w: 1 };
    const r = rotateVector(v, q);
    expect(Math.hypot(r.x, r.y, r.z)).toBeCloseTo(Math.hypot(v.x, v.y, v.z), 5);
  });
});
