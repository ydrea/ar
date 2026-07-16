import * as Location from "expo-location";

import { getCompassCalibrationPercent, sensorHub } from "@/cumquat/sensors";

type HeadingSample = {
  accuracy: number;
  magHeading: number;
  trueHeading: number;
};

describe("SensorHub compass integration", () => {
  const location = Location as jest.Mocked<typeof Location>;
  let emitHeading: ((sample: HeadingSample) => void) | null;
  let removeHeading: jest.Mock;

  beforeEach(() => {
    sensorHub.stop();
    emitHeading = null;
    removeHeading = jest.fn();

    location.getForegroundPermissionsAsync.mockResolvedValue({
      status: "granted",
    } as Awaited<ReturnType<typeof Location.getForegroundPermissionsAsync>>);

    location.watchPositionAsync.mockResolvedValue({
      remove: jest.fn(),
    } as Awaited<ReturnType<typeof Location.watchPositionAsync>>);

    location.watchHeadingAsync.mockImplementation(async (callback) => {
      emitHeading = callback as (sample: HeadingSample) => void;
      return { remove: removeHeading };
    });
  });

  afterEach(() => {
    sensorHub.stop();
  });

  test("two consumers share one native subscription", async () => {
    await sensorHub.start();
    await sensorHub.start();

    expect(Location.watchHeadingAsync).toHaveBeenCalledTimes(1);

    sensorHub.stop();

    // Still active because one consumer remains.
    expect(removeHeading).not.toHaveBeenCalled();

    sensorHub.stop();

    expect(removeHeading).toHaveBeenCalledTimes(1);
  });

  test("stores true heading and calibration accuracy in the snapshot", async () => {
    await sensorHub.start();

    expect(location.watchHeadingAsync).toHaveBeenCalledTimes(1);
    expect(emitHeading).toEqual(expect.any(Function));

    emitHeading?.({
      accuracy: 2,
      magHeading: 126,
      trueHeading: 121,
    });

    expect(sensorHub.getSnapshot()).toMatchObject({
      heading: 121,
      magneticHeading: 126,
      trueHeading: 121,
      headingAccuracy: 2,
    });

    expect(getCompassCalibrationPercent(2)).toBe(67);
  });

  test("falls back to magnetic heading when true heading is unavailable", async () => {
    await sensorHub.start();

    emitHeading?.({
      accuracy: 1,
      magHeading: -82,
      trueHeading: -1,
    });

    expect(sensorHub.getSnapshot()).toMatchObject({
      heading: 278,
      magneticHeading: 278,
      trueHeading: null,
      headingAccuracy: 1,
    });
  });

  test("stops the heading subscription", async () => {
    await sensorHub.start();
    sensorHub.stop();

    expect(removeHeading).toHaveBeenCalledTimes(1);
  });

  test.each([
    [-1, 0],
    [0, 0],
    [1, 33],
    [2, 67],
    [3, 100],
    [4, 100],
  ])("maps accuracy %s to %s percent", (accuracy, expected) => {
    expect(getCompassCalibrationPercent(accuracy)).toBe(expected);
  });
});
