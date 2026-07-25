import { gestureConfig } from '../src/config';
import {
  applyRubberBandValue,
  clamp,
  createGestureInput,
  getLimitExcess,
  normalizeState,
  rubberBandResistance,
  snapState,
  updateHorizontal,
  updateVertical,
  validateState,
} from '../src/gestureMath';
import type { GestureConfig, GestureState } from '../src/types';

const state = (
  overrides: Partial<GestureState> = {}
): GestureState => ({
  minDistance: 100,
  maxDistance: 13_500,
  zoom: 0.25,
  fov: 60,
  ...overrides,
});

describe('gestureMath', () => {
  test('clamp supports normal and reversed bounds', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(11, 0, 10)).toBe(10);
    expect(clamp(11, 10, 0)).toBe(10);
  });

  test('normalizeState orders distances without mutating input', () => {
    const input = state({ minDistance: 1_000, maxDistance: 500 });
    const result = normalizeState(input);

    expect(result.minDistance).toBe(500);
    expect(result.maxDistance).toBe(1_000);
    expect(input.minDistance).toBe(1_000);
    expect(result).not.toBe(input);
  });

  test('validateState normalizes and enforces the distance gap', () => {
    const result = validateState(
      state({ minDistance: 100, maxDistance: 150 })
    );

    expect(result.maxDistance - result.minDistance).toBe(
      gestureConfig.distance.minGap
    );
  });

  test('validateState clamps every bounded field', () => {
    expect(
      validateState({
        minDistance: -1_000,
        maxDistance: 1_000_000,
        zoom: 2.5,
        fov: 999,
      })
    ).toEqual({
      minDistance: gestureConfig.distance.min,
      maxDistance: gestureConfig.distance.max,
      zoom: 1,
      fov: gestureConfig.fov.max,
    });
  });

  test('validateState converts non-finite input into a finite state', () => {
    const result = validateState({
      minDistance: Number.NaN,
      maxDistance: Number.POSITIVE_INFINITY,
      zoom: Number.NEGATIVE_INFINITY,
      fov: Number.NaN,
    });

    expect(Object.values(result).every(Number.isFinite)).toBe(true);
    expect(result.maxDistance - result.minDistance).toBeGreaterThanOrEqual(
      gestureConfig.distance.minGap
    );
  });

  test('rubber-band resistance falls as excess grows', () => {
    const small = rubberBandResistance(10);
    const large = rubberBandResistance(10_000);

    expect(rubberBandResistance(0)).toBe(1);
    expect(large).toBeLessThan(small);
    expect(large).toBeGreaterThanOrEqual(
      1 - gestureConfig.gesture.rubberBandMaxResistance
    );
  });

  test('rubber-band overshoot remains outside but is resisted', () => {
    const below = applyRubberBandValue(-100, 0, 100, 'min');
    const above = applyRubberBandValue(200, 0, 100, 'max');

    expect(below).toMatchObject({
      rubberBanding: true,
      activeLimit: 'min',
      excess: 100,
    });
    expect(below.value).toBeLessThan(0);
    expect(below.value).toBeGreaterThan(-100);

    expect(above).toMatchObject({
      rubberBanding: true,
      activeLimit: 'max',
      excess: 100,
    });
    expect(above.value).toBeGreaterThan(100);
    expect(above.value).toBeLessThan(200);
  });

  test('createGestureInput supplies safe defaults', () => {
    expect(createGestureInput(12, -5)).toEqual({
      translationX: 12,
      translationY: -5,
      velocityX: 0,
      velocityY: 0,
      scale: 1,
      focalX: 0,
      focalY: 0,
      numberOfPointers: 2,
    });
  });

  test('horizontal movement changes only FOV', () => {
    const base = state();
    const result = updateHorizontal(base, createGestureInput(100, 0));

    expect(result.state).toEqual({ ...base, fov: 80 });
    expect(result.rubberBanding).toBe(false);
  });

  test('horizontal FOV overshoot rubber-bands then snaps back', () => {
    const result = updateHorizontal(
      state({ fov: gestureConfig.fov.max }),
      createGestureInput(100, 0)
    );

    expect(result.activeLimit).toBe('fov');
    expect(result.state.fov).toBeGreaterThan(gestureConfig.fov.max);
    expect(snapState(result.state).fov).toBe(gestureConfig.fov.max);
  });

  test('upward vertical movement increases distance and zoom', () => {
    const base = state({ zoom: 0, maxDistance: 13_500 });
    const result = updateVertical(base, createGestureInput(0, -10));

    expect(result.state.minDistance).toBe(base.minDistance);
    expect(result.state.maxDistance).toBe(17_500);
    expect(result.state.zoom).toBeCloseTo(0.015, 8);
    expect(result.state.fov).toBe(base.fov);
  });

  test('maximum-distance overshoot snaps to the configured maximum', () => {
    const result = updateVertical(
      state({ maxDistance: 134_000 }),
      createGestureInput(0, -10)
    );

    expect(result.activeLimit).toBe('max');
    expect(result.excess).toBe(3_000);
    expect(result.state.maxDistance).toBeGreaterThan(
      gestureConfig.distance.max
    );
    expect(snapState(result.state).maxDistance).toBe(
      gestureConfig.distance.max
    );
  });

  test('zoom can be the active limit with distance coupling disabled', () => {
    const config: GestureConfig = {
      ...gestureConfig,
      distance: { ...gestureConfig.distance, max: 1_000_000_000 },
      gesture: {
        ...gestureConfig.gesture,
        verticalPixelToMeter: 0,
        verticalPixelToZoom: 1,
        zoomCouplingFactor: 1,
      },
    };

    const result = updateVertical(
      state({ zoom: 0.5 }),
      createGestureInput(0, -2),
      config
    );

    expect(result.activeLimit).toBe('zoom');
    expect(result.excess).toBe(1.5);
    expect(result.state.zoom).toBeGreaterThan(1);
  });

  test('getLimitExcess reports only actual overflow', () => {
    expect(getLimitExcess(state(), 'fov')).toBe(0);
    expect(getLimitExcess(state({ fov: 125 }), 'fov')).toBe(5);
    expect(getLimitExcess(state({ zoom: -0.2 }), 'zoom')).toBeCloseTo(0.2);
    expect(
      getLimitExcess(
        state({ maxDistance: gestureConfig.distance.max + 500 }),
        'max'
      )
    ).toBe(500);
  });
});
