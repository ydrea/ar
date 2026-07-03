import {
  geoToENU,
  rotateVector,
  projectToScreen,
  projectToScreenWithClipping,
} from "@/cumquat/sensors";

describe("sensors utilities", () => {
  test("geoToENU returns near-zero for identical coords", () => {
    const p = geoToENU(45.8, 15.96, 120, 45.8, 15.96, 120);
    expect(p.x).toBeCloseTo(0, 2);
    expect(p.y).toBeCloseTo(0, 2);
    expect(p.z).toBeCloseTo(0, 2);
  });

  test("rotateVector identity preserves vector", () => {
    const v = { x: 3, y: 4, z: 12 };
    const q = { x: 0, y: 0, z: 0, w: 1 };
    const r = rotateVector(v, q);
    expect(r.x).toBeCloseTo(v.x, 5);
    expect(r.y).toBeCloseTo(v.y, 5);
    expect(r.z).toBeCloseTo(v.z, 5);
  });

  test("projectToScreen returns invisible for behind-camera", () => {
    const res = projectToScreen({ x: 0, y: 0, z: 10 }, 1000, 500, 60);
    expect(res.visible).toBe(false);
  });

  test("visible object is not distance-clipped", () => {
    const res = projectToScreenWithClipping(
      { x: 0, y: 0, z: -10 },
      10,
      1000,
      500,
      60,
      1,
      100,
    );

    expect(res.clippedByDistance).toBe(null);
    expect(res.depth).toBeCloseTo(10);
    expect(res.visible).toBe(true);
  });

  test("too close object is min-clipped", () => {
    const res = projectToScreenWithClipping(
      { x: 0, y: 0, z: -0.05 },
      0.05,
      1000,
      500,
      60,
      1,
      100,
    );

    expect(res.visible).toBe(false);
    expect(res.clippedByDistance).toBe("min");
    expect(res.depth).toBeCloseTo(0.05);
  });

  test("too far object is max-clipped", () => {
    const res = projectToScreenWithClipping(
      { x: 0, y: 0, z: -500 },
      500,
      1000,
      500,
      60,
      1,
      100,
    );

    expect(res.visible).toBe(false);
    expect(res.clippedByDistance).toBe("max");
    expect(res.depth).toBeCloseTo(500);
  });

  test("behind-camera object is not distance-clipped", () => {
    const res = projectToScreenWithClipping(
      { x: 0, y: 0, z: 10 },
      -10,
      1000,
      500,
      60,
      1,
      100,
    );

    expect(res.visible).toBe(false);
    expect(res.depth).toBeLessThan(0);
  });

  test("offscreen object is not distance-clipped", () => {
    const res = projectToScreenWithClipping(
      { x: 1000, y: 0, z: -10 },
      10,
      1000,
      500,
      60,
      1,
      100,
    );

    expect(res.visible).toBe(false);
    expect(res.clippedByDistance).toBe(null);
  });

  test("just above min is not min-clipped", () => {
    const res = projectToScreenWithClipping(
      { x: 0, y: 0, z: -1.01 },
      1.01,
      1000,
      500,
      60,
      1,
      100,
    );

    expect(res.clippedByDistance).toBe(null);
  });
});
