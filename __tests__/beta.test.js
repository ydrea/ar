import React from "react";
import { render, waitFor } from "@testing-library/react-native";
import ARView from "@/app/(tabs)/beta";

const originalError = console.error;

jest.mock("@/cumquat/sensors", () => {
  const mockSensorHub = {
    start: jest.fn().mockResolvedValue(undefined),
    stop: jest.fn(),
    getSnapshot: jest.fn(() => ({
      lat: 45.8,
      lon: 15.96,
      elevation: 120,
      orientation: { x: 0, y: 0, z: 0, w: 1 },
      timestamp: Date.now(),
    })),
  };

  return {
    sensorHub: mockSensorHub,
    geoToENU: jest.fn(() => ({ x: 0, y: 0, z: -10 })),
    rotateVector: jest.fn((v) => v),
    calculateBearing: jest.fn(() => 0),
    projectToScreenWithClipping: jest.fn(() => ({
      x: 100,
      y: 100,
      visible: true,
      clipped: false,
      clippedByDistance: null,
      depth: 10,
      radialDistance: 10,
    })),
  };
});

const mockRubberBandVisualFeedback = jest.fn(() => null);

jest.mock("@/ui/RubberBandVisualFeedback", () => ({
  RubberBandVisualFeedback: (props) => {
    mockRubberBandVisualFeedback(props);
    return null;
  },
}));

jest.mock("expo-camera", () => ({
  CameraView: "CameraView",
}));

jest.mock("react-native-gesture-handler", () => {
  const React = require("react");
  const { View } = require("react-native");

  const chain = {
    minPointers: () => chain,
    maxPointers: () => chain,
    activateAfterLongPress: () => chain,
    onTouchesDown: () => chain,
    onTouchesMove: () => chain,
    onTouchesUp: () => chain,
  };

  return {
    Gesture: {
      Pan: () => chain,
    },
    GestureDetector: ({ children }) => <View>{children}</View>,
    GestureHandlerRootView: ({ children }) => <View>{children}</View>,
  };
});

jest.mock("react-native-svg", () => {
  const React = require("react");
  const { View, Text } = require("react-native");
  return {
    Svg: ({ children }) => <View>{children}</View>,
    Line: (props) => <View {...props} />,
    Text: ({ children }) => <Text>{children}</Text>,
  };
});

describe("beta ARView", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.error = (...args) => {
      const first = String(args[0] || "");
      if (first.includes("not configured to support act")) return;
      if (first.includes("not wrapped in act")) return;
      originalError(...args);
    };
  });

  afterEach(() => {
    console.error = originalError;
  });

  test("renders and starts sensor hub", async () => {
    render(<ARView />);

    await waitFor(() => {
      expect(require("@/cumquat/sensors").sensorHub.start).toHaveBeenCalled();
    });
  });

  test("passes default props to RubberBandVisualFeedback", async () => {
    render(<ARView />);

    await waitFor(() => {
      expect(mockRubberBandVisualFeedback).toHaveBeenCalled();
    });

    expect(mockRubberBandVisualFeedback.mock.calls.at(-1)[0]).toEqual({
      isActive: false,
      intensity: 0,
      limitType: null,
    });
  });
});
