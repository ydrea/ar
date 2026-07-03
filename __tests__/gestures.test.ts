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
