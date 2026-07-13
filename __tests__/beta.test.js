// __tests__/beta.test.js
import React from "react";
import {
  act,
  fireEvent,
  render,
  waitFor,
  screen,
} from "@testing-library/react-native";
import ARView from "@/app/(tabs)/gest";

const originalError = console.error;
const originalLog = console.log;

const mockSetGestureState = jest.fn((nextState) => nextState);
const mockUseARGestureController = jest.fn(() => ({
  gesture: {kind: "mock-two-finger-pan"},
  setState: mockSetGestureState,
}));
const mockAnimatedZoom = {value: 0};

const mockProjectedPOIs = Array.from({length: 36}, (_, poiIndex) => ({
  poiIndex,
  x: 100,
  y: 100,
  depth: 10,
  distance: 10,
  bearing: 0,
  visible: true,
  clipped: false,
  clippedByDistance: null,
}));

const mockNativeEngine = {
  initialize: jest.fn(),
  setViewState: jest.fn(),
  update: jest.fn(() => 1),
  getFrame: jest.fn(() => ({
    sequence: 1,
    timestampNs: 1,
    projectedPOIs: mockProjectedPOIs,
    visiblePOIs: mockProjectedPOIs,
  })),
  dispose: jest.fn(),
};

const mockNativeEngineFactory = {
  create: jest.fn(() => mockNativeEngine),
  getNativeVersion: jest.fn(() => "test-cpp"),
};

jest.mock("@/modules/cumquat-native/src", () => ({
  CumquatEngine: mockNativeEngineFactory,
}));

jest.mock("@/cumquat/gestures/useARGestureController", () => ({
  useARGestureController: (options) => mockUseARGestureController(options),
}));

jest.mock("@/hooks/useCameraZoom", () => {
  const React = require("react");
  const {View} = require("react-native");

  const MockAnimatedCamera = React.forwardRef((props, ref) => {
    const {
      animatedProps: _animatedProps,
      onCameraReady: _onCameraReady,
      onMountError: _onMountError,
      ...viewProps
    } = props;
    return <View ref={ref} testID="animated-camera" {...viewProps} />;
  });

  return {
    useCameraZoom: jest.fn(() => ({
      cameraRef: {current: null},
      animatedZoom: mockAnimatedZoom,
      animatedProps: {zoom: 0},
      AnimatedCamera: MockAnimatedCamera,
      animateZoom: jest.fn(),
      setZoom: jest.fn(),
      resetZoom: jest.fn(),
      isAnimating: {value: false},
    })),
  };
});

jest.mock("@/cumquat/sensors", () => {
  const mockSensorHub = {
    start: jest.fn().mockResolvedValue(undefined),
    stop: jest.fn(),
    getSnapshot: jest.fn(() => ({
      lat: 45.8,
      lon: 15.96,
      elevation: 120,
      orientation: {x: 0, y: 0, z: 0, w: 1},
      timestamp: Date.now(),
    })),
  };

  return {
    sensorHub: mockSensorHub,
    geoToENU: jest.fn(() => ({x: 0, y: 0, z: -10})),
    rotateVector: jest.fn((vector) => vector),
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
  const {View} = require("react-native");

  return {
    GestureDetector: ({children}) => <View>{children}</View>,
    GestureHandlerRootView: ({children, ...props}) => (
      <View {...props}>{children}</View>
    ),
  };
});

jest.mock("react-native-svg", () => {
  const React = require("react");
  const {View, Text} = require("react-native");

  return {
    Svg: ({children}) => <View>{children}</View>,
    Circle: () => null,
    Line: () => null,
    Text: ({children}) => <Text>{children}</Text>,
  };
});

describe("beta ARView", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSetGestureState.mockImplementation((nextState) => nextState);
    mockUseARGestureController.mockImplementation(() => ({
      gesture: {kind: "mock-two-finger-pan"},
      setState: mockSetGestureState,
    }));
    mockNativeEngine.update.mockReturnValue(1);
    mockNativeEngine.getFrame.mockReturnValue({
      sequence: 1,
      timestampNs: 1,
      projectedPOIs: mockProjectedPOIs,
      visiblePOIs: mockProjectedPOIs,
    });
    mockNativeEngineFactory.create.mockReturnValue(mockNativeEngine);

    console.log = jest.fn();
    console.error = (...args) => {
      const first = String(args[0] || "");
      if (first.includes("not configured to support act")) return;
      if (first.includes("not wrapped in act")) return;
      originalError(...args);
    };
  });

  afterEach(() => {
    console.error = originalError;
    console.log = originalLog;
  });

  test("renders the animated camera and starts SensorHub", async () => {
    await render(<ARView />);
    expect(screen.getByTestId("animated-camera")).toBeTruthy();
    await waitFor(() => {
      expect(
        require("@/cumquat/sensors").sensorHub.start,
      ).toHaveBeenCalledTimes(1);
    });
  });

  test("creates one native engine with a hard dataset radius", async () => {
    await render(<ARView />);

    await waitFor(() => {
      expect(mockNativeEngineFactory.create).toHaveBeenCalledWith({
        datasetRadiusMeters: 135_000,
        maxVisiblePOIs: 36,
      });
      expect(mockNativeEngine.initialize).toHaveBeenCalledTimes(1);
      expect(mockNativeEngine.setViewState).toHaveBeenCalledWith({
        horizontalFovDegrees: 120,
        minDistanceMeters: 0,
        maxDistanceMeters: 13_500,
      });
      expect(mockNativeEngine.update).toHaveBeenCalled();
      expect(mockNativeEngine.getFrame).toHaveBeenCalled();
    });
  });

  test("configures the new gesture hook with default state and camera zoom", async () => {
    await render(<ARView />);

    expect(mockUseARGestureController).toHaveBeenCalled();
    const options = mockUseARGestureController.mock.calls.at(-1)[0];

    expect(options.initialState).toEqual({
      minDistance: 0,
      maxDistance: 13_500,
      zoom: 0,
      fov: 120,
    });
    expect(options.cameraZoom).toBe(mockAnimatedZoom);
    expect(options.callbacks.onUpdate).toEqual(expect.any(Function));
    expect(options.callbacks.onEnd).toEqual(expect.any(Function));
  });

  test("passes inactive defaults to RubberBandVisualFeedback", async () => {
    await render(<ARView />);

    await waitFor(() => {
      expect(mockRubberBandVisualFeedback).toHaveBeenCalled();
    });

    expect(mockRubberBandVisualFeedback.mock.calls.at(-1)[0]).toEqual({
      isActive: false,
      intensity: 0,
      limitType: null,
    });
  });

  test("gesture updates mutate native view state without recreating the engine", async () => {
    await render(<ARView />);
    await waitFor(() => {
      expect(mockNativeEngineFactory.create).toHaveBeenCalledTimes(1);
    });
    const options = mockUseARGestureController.mock.calls.at(-1)[0];

    await act(() => {
      options.callbacks.onUpdate({
        state: {
          minDistance: 500,
          maxDistance: 25_000,
          zoom: 0.4,
          fov: 75,
        },
        rubberBanding: true,
        activeLimit: "max",
        excess: 500,
      });
    });

    expect(screen.getByText("0.5km")).toBeTruthy();
    expect(screen.getByText("25.0km")).toBeTruthy();
    expect(screen.getByText("75°")).toBeTruthy();
    expect(mockNativeEngine.setViewState).toHaveBeenLastCalledWith({
      horizontalFovDegrees: 75,
      minDistanceMeters: 500,
      maxDistanceMeters: 25_000,
    });
    expect(mockNativeEngineFactory.create).toHaveBeenCalledTimes(1);
    expect(mockNativeEngine.initialize).toHaveBeenCalledTimes(1);
    expect(mockNativeEngine.dispose).not.toHaveBeenCalled();
    expect(mockRubberBandVisualFeedback.mock.calls.at(-1)[0]).toEqual({
      isActive: true,
      intensity: 1,
      limitType: "max",
    });
  });

  test("reset sends the default state through the gesture controller", async () => {
    await render(<ARView />);
    await waitFor(() => {
      expect(mockNativeEngineFactory.create).toHaveBeenCalled();
    });

    fireEvent.press(screen.getByText("↺"));

    expect(mockSetGestureState).toHaveBeenCalledWith({
      minDistance: 0,
      maxDistance: 13_500,
      zoom: 0,
      fov: 120,
    });
    expect(mockNativeEngine.dispose).toHaveBeenCalled();
  });
});
