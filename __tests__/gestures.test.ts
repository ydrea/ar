import { AR_CONSTANTS } from "@/cumquat/constants";
import { ARGestureController } from "@/cumquat/gestures/ArGestureControler";

describe("ARGestureController", () => {
  test("updateState and getState stay in sync", () => {
    const ctl = new ARGestureController();
    ctl.updateState(10, 100, 0.25, 60);
    expect(ctl.getState()).toEqual({
      min: 10,
      max: 100,
      zoom: 0.25,
      fov: 60,
    });
  });

  test("creates a gesture", () => {
    const ctl = new ARGestureController();
    expect(ctl.createGesture()).toBeTruthy();
  });
});

// test("FOV clamps to valid range", () => {
//   const ctl = new ARGestureController();

//   ctl.updateState(1, 1000, 0, 999);

//   expect(ctl.getState().fov).toBeLessThanOrEqual(AR_CONSTANTS.FOV.MAX);
// });

// test("min distance cannot exceed max distance", () => {
//   const ctl = new ARGestureController();

//   ctl.updateState(1000, 500, 0, 60);

//   const s = ctl.getState();

//   expect(s.min).toBeLessThanOrEqual(s.max);
// });

test("updateState preserves overshoot values for rubberbanding", () => {
  const ctl = new ARGestureController();

  ctl.updateState(1000, 500, 0, 999);

  expect(ctl.getState()).toEqual({
    min: 1000,
    max: 500,
    zoom: 0,
    fov: 999,
  });
});

// test("getExcessForLimit returns correct values", () => {
//   const ctl = new ARGestureController();

//   ctl.updateState(1000, 500, 0, 999);

//   expect(ctl.getExcessForLimit(AR_CONSTANTS.DISTANCE.MIN)).toBe(1000);
//   expect(ctl.getExcessForLimit(AR_CONSTANTS.DISTANCE.MAX)).toBe(500);
//   expect(ctl.getExcessForLimit(AR_CONSTANTS.FOV.MIN)).toBe(0);
//   expect(ctl.getExcessForLimit(AR_CONSTANTS.FOV.MAX)).toBe(999);
// });
