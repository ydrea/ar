import {remapQuaternionToHomeButtonRight} from "@/cumquat/landscapeRightOrientation";
import {rotateVector} from "@/cumquat/sensors";

describe("home-button-right landscape orientation", () => {
  test("rotates the existing screen frame by 180 degrees", () => {
    const corrected = remapQuaternionToHomeButtonRight({
      x: 0,
      y: 0,
      z: 0,
      w: 1,
    });

    expect(rotateVector({x: 3, y: 4, z: 5}, corrected)).toEqual({
      x: -3,
      y: -4,
      z: 5,
    });
  });

  test("preserves quaternion length", () => {
    const source = {x: 0.2, y: -0.3, z: 0.4, w: 0.842614977};
    const corrected = remapQuaternionToHomeButtonRight(source);

    expect(
      Math.hypot(corrected.x, corrected.y, corrected.z, corrected.w),
    ).toBeCloseTo(Math.hypot(source.x, source.y, source.z, source.w), 10);
  });

  test("applying the side change twice returns the same rotation", () => {
    const source = {x: 0.2, y: -0.3, z: 0.4, w: 0.842614977};
    const twice = remapQuaternionToHomeButtonRight(
      remapQuaternionToHomeButtonRight(source),
    );

    // Quaternions q and -q represent the same physical rotation.
    expect(twice.x).toBeCloseTo(-source.x, 10);
    expect(twice.y).toBeCloseTo(-source.y, 10);
    expect(twice.z).toBeCloseTo(-source.z, 10);
    expect(twice.w).toBeCloseTo(-source.w, 10);
  });
});
