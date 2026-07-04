// __tests__/sensors.test.ts

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

  // function signature (cameraPos, trueDistance, width, height, fov, min, max)

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

// geoToENU
test("geoToENU eastward movement produces positive X", () => {
  const p = geoToENU(45.8, 15.96, 0, 45.8, 15.961, 0);

  expect(p.x).toBeGreaterThan(0);
});

test("geoToENU northward movement produces positive Y", () => {
  const p = geoToENU(45.8, 15.96, 0, 45.801, 15.96, 0);

  expect(p.y).toBeGreaterThan(0);
});

test("geoToENU upward movement produces positive Z", () => {
  const p = geoToENU(45.8, 15.96, 0, 45.8, 15.96, 10);

  expect(p.z).toBeGreaterThan(0);
});

// projectToScreen
test("projectToScreen returns visible for in-front-of-camera", () => {
  const res = projectToScreen({ x: 0, y: 0, z: -10 }, 1000, 500, 60);
  expect(res.visible).toBe(true);
});
test("centered object projects to screen center", () => {
  const res = projectToScreenWithClipping(
    { x: 0, y: 0, z: -10 },
    10,
    1000,
    500,
    60,
    1,
    100,
  );

  expect(res.visible).toBe(true);
  expect(res.x).toBeCloseTo(500, 1);
  expect(res.y).toBeCloseTo(250, 1);
});
test("behind-camera object is invisible", () => {
  const res = projectToScreenWithClipping(
    { x: 0, y: 0, z: 10 },
    10,
    1000,
    500,
    60,
    1,
    100,
  );

  expect(res.visible).toBe(false);
});

// test("wider FOV compresses projection toward center", () => {
//   const narrow = projectToScreenWithClipping(
//     { x: 1, y: 0, z: -10 },
//     10,
//     1000,
//     500,
//     30,
//     1,
//     100,
//   );

//   const wide = projectToScreenWithClipping(
//     { x: 1, y: 0, z: -10 },
//     10,
//     1000,
//     500,
//     90,
//     1,
//     100,
//   );

//   expect(narrow.visible).toBe(true);
//   expect(wide.visible).toBe(true);
//   //////////////////////
//   console.log("narrow:", narrow);
//   console.log("wide:", wide);
//   //////////////////////
//   expect(Math.abs(wide.x - 500)).toBeLessThan(Math.abs(narrow.x - 500));
// });

test("identity quaternion preserves vector", () => {
  const v = { x: 1, y: 2, z: 3 };

  const r = rotateVector(v, { x: 0, y: 0, z: 0, w: 1 });

  expect(r.x).toBeCloseTo(v.x, 5);
  expect(r.y).toBeCloseTo(v.y, 5);
  expect(r.z).toBeCloseTo(v.z, 5);
});

test("180 degree yaw flips forward vector", () => {
  const v = { x: 0, y: 0, z: -1 };

  const q = {
    x: 0,
    y: 1,
    z: 0,
    w: 0,
  };

  const r = rotateVector(v, q);

  expect(r.z).toBeCloseTo(1, 3);
});
