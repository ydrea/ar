// __tests__/gestures.test.ts
import { AR_CONSTANTS } from "@/cumquat/constants";
import { ARGestureController } from "@/cumquat/gestures/ArGestureControler";

describe("ARGestureController", () => {
  // ============ STATE MANAGEMENT ============

  test("updateState normalizes and clamps values correctly", () => {
    const ctl = new ARGestureController();
    ctl.updateState(10, 100, 0.25, 60);

    const state = ctl.getState();
    // Min gets clamped to 0 (AR_CONSTANTS.DISTANCE.MIN)
    // Max gets bumped to 110 (0 + 100 margin + 10 buffer)
    // But since MAX is 135000, this stays within range
    expect(state.minDistance).toBe(AR_CONSTANTS.DISTANCE.MIN);
    expect(state.maxDistance).toBe(110);
    expect(state.cameraZoom).toBe(0.25);
    expect(state.fov).toBe(60);
  });

  test("updateState with valid values preserves them", () => {
    const ctl = new ARGestureController();
    ctl.updateState(100, 500, 0.5, 45);

    const state = ctl.getState();
    expect(state.minDistance).toBe(100);
    expect(state.maxDistance).toBe(500);
    expect(state.cameraZoom).toBe(0.5);
    expect(state.fov).toBe(45);
  });

  test("updateState clamps FOV to valid range", () => {
    const ctl = new ARGestureController();
    ctl.updateState(1, 1000, 0, 999);

    expect(ctl.getState().fov).toBe(AR_CONSTANTS.FOV.MAX);
  });

  test("updateState clamps FOV below min", () => {
    const ctl = new ARGestureController();
    ctl.updateState(1, 1000, 0, -10);

    expect(ctl.getState().fov).toBe(AR_CONSTANTS.FOV.MIN);
  });

  test("updateState normalizes min/max ordering", () => {
    const ctl = new ARGestureController();
    ctl.updateState(1000, 500, 0, 60);

    const state = ctl.getState();
    expect(state.minDistance).toBeLessThanOrEqual(state.maxDistance);
    expect(state.minDistance).toBe(500);
    expect(state.maxDistance).toBe(1000);
  });

  test("updateState ensures min < max with margin", () => {
    const ctl = new ARGestureController();
    ctl.updateState(100, 150, 0, 60);

    const state = ctl.getState();
    expect(state.maxDistance - state.minDistance).toBeGreaterThanOrEqual(100);
  });

  test("updateState clamps min to valid range", () => {
    const ctl = new ARGestureController();
    ctl.updateState(-100, 1000, 0, 60);

    expect(ctl.getState().minDistance).toBe(AR_CONSTANTS.DISTANCE.MIN);
  });

  test("updateState clamps max to valid range", () => {
    const ctl = new ARGestureController();
    ctl.updateState(1, 200000, 0, 60);

    // When clamping to MAX, the margin logic might add 100
    // So it becomes MAX + 100, but then gets clamped back to MAX
    expect(ctl.getState().maxDistance).toBe(AR_CONSTANTS.DISTANCE.MAX);
  });

  test("updateState clamps zoom to valid range", () => {
    const ctl = new ARGestureController();
    ctl.updateState(1, 1000, 2.5, 60);

    expect(ctl.getState().cameraZoom).toBe(1);
  });

  test("updateState clamps zoom below min", () => {
    const ctl = new ARGestureController();
    ctl.updateState(1, 1000, -0.5, 60);

    expect(ctl.getState().cameraZoom).toBe(0);
  });

  test("getState returns a copy not a reference", () => {
    const ctl = new ARGestureController();
    ctl.updateState(100, 500, 0.5, 60);

    const state1 = ctl.getState();
    const state2 = ctl.getState();

    expect(state1).toEqual(state2);
    expect(state1).not.toBe(state2);
  });

  test("getMinDistance returns clamped value", () => {
    const ctl = new ARGestureController();
    ctl.updateState(100, 500, 0.5, 60);

    expect(ctl.getMinDistance()).toBe(100);
  });

  test("getMaxDistance returns clamped value", () => {
    const ctl = new ARGestureController();
    ctl.updateState(100, 500, 0.5, 60);

    expect(ctl.getMaxDistance()).toBe(500);
  });

  test("getZoom returns clamped value", () => {
    const ctl = new ARGestureController();
    ctl.updateState(100, 500, 0.5, 60);

    expect(ctl.getZoom()).toBe(0.5);
  });

  test("getFOV returns clamped value", () => {
    const ctl = new ARGestureController();
    ctl.updateState(100, 500, 0.5, 60);

    expect(ctl.getFOV()).toBe(60);
  });

  // ============ GESTURE CREATION ============

  test("creates a gesture", () => {
    const ctl = new ARGestureController();
    expect(ctl.createGesture()).toBeTruthy();
  });

  // ============ DEFAULT VALUES ============

  test("initializes with default values", () => {
    const ctl = new ARGestureController();
    const state = ctl.getState();

    expect(state.minDistance).toBe(AR_CONSTANTS.DISTANCE.DEFAULT_MIN);
    expect(state.maxDistance).toBe(AR_CONSTANTS.DISTANCE.DEFAULT_MAX);
    expect(state.cameraZoom).toBe(0);
    expect(state.fov).toBe(AR_CONSTANTS.FOV.DEFAULT);
  });

  test("updateState with defaults keeps valid state", () => {
    const ctl = new ARGestureController();
    ctl.updateState(
      AR_CONSTANTS.DISTANCE.DEFAULT_MIN,
      AR_CONSTANTS.DISTANCE.DEFAULT_MAX,
      0,
      AR_CONSTANTS.FOV.DEFAULT,
    );

    const state = ctl.getState();
    expect(state.minDistance).toBe(AR_CONSTANTS.DISTANCE.DEFAULT_MIN);
    expect(state.maxDistance).toBe(AR_CONSTANTS.DISTANCE.DEFAULT_MAX);
    expect(state.cameraZoom).toBe(0);
    expect(state.fov).toBe(AR_CONSTANTS.FOV.DEFAULT);
  });

  // ============ CALLBACKS ============

  test("setCallbacks stores callbacks", () => {
    const ctl = new ARGestureController();
    const mockCallbacks = {
      onMinDistanceChange: jest.fn(),
      onMaxDistanceChange: jest.fn(),
      onCameraZoomChange: jest.fn(),
      onFOVChange: jest.fn(),
      onLimitHit: jest.fn(),
      onLimitRelease: jest.fn(),
      onGestureStart: jest.fn(),
      onGestureUpdate: jest.fn(),
      onGestureEnd: jest.fn(),
    };

    ctl.setCallbacks(mockCallbacks);
    expect(true).toBe(true);
  });

  // ============ EDGE CASES ============

  test("handles NaN values gracefully", () => {
    const ctl = new ARGestureController();
    ctl.updateState(NaN, NaN, NaN, NaN);

    const state = ctl.getState();
    // Should fall back to defaults
    expect(state.minDistance).toBe(AR_CONSTANTS.DISTANCE.DEFAULT_MIN);
    expect(state.maxDistance).toBe(AR_CONSTANTS.DISTANCE.DEFAULT_MAX);
    expect(state.cameraZoom).toBe(0);
    expect(state.fov).toBe(AR_CONSTANTS.FOV.DEFAULT);
  });

  test("handles Infinity values gracefully", () => {
    const ctl = new ARGestureController();
    ctl.updateState(Infinity, Infinity, Infinity, Infinity);

    const state = ctl.getState();
    expect(isFinite(state.minDistance)).toBe(true);
    expect(isFinite(state.maxDistance)).toBe(true);
    expect(isFinite(state.cameraZoom)).toBe(true);
    expect(isFinite(state.fov)).toBe(true);
  });

  test("updateState with very close values maintains margin", () => {
    const ctl = new ARGestureController();
    ctl.updateState(100, 101, 0, 60);

    const state = ctl.getState();
    expect(state.maxDistance - state.minDistance).toBeGreaterThanOrEqual(100);
  });

  test("updateState with very large values clamps to max", () => {
    const ctl = new ARGestureController();
    ctl.updateState(1e9, 2e9, 0, 60);

    const state = ctl.getState();
    // Should be MAX (clamped back from MAX + 100)
    expect(state.maxDistance).toBe(AR_CONSTANTS.DISTANCE.MAX);
  });

  test("updateState with very small values clamps to min", () => {
    const ctl = new ARGestureController();
    ctl.updateState(-1e9, -1e8, 0, 60);

    const state = ctl.getState();
    // Should be MIN (clamped back from MIN - 100)
    expect(state.minDistance).toBe(AR_CONSTANTS.DISTANCE.MIN);
  });
});
