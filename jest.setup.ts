import "react-native-gesture-handler/jestSetup";

jest.mock("react-native-reanimated", () => ({
  __esModule: true,
  default: {
    call: () => {},
  },
  runOnJS: (fn: any) => fn,
}));

jest.mock("react-native-gesture-handler", () => {
  const actual = jest.requireActual("react-native-gesture-handler");
  return {
    ...actual,
    Gesture: {
      Pan: () => ({
        minPointers: () => ({
          maxPointers: () => ({
            activateAfterLongPress: () => ({
              onTouchesDown: () => ({
                onTouchesMove: () => ({
                  onTouchesUp: () => ({}),
                }),
              }),
            }),
          }),
        }),
      }),
    },
  };
});

jest.mock("expo-camera", () => ({
  CameraView: "CameraView",
  useCameraPermissions: () => [null, jest.fn()],
}));

jest.mock("expo-sensors", () => ({
  DeviceMotion: {
    requestPermissionsAsync: jest.fn(),
    setUpdateInterval: jest.fn(),
    addListener: jest.fn(),
  },
}));

jest.mock("expo-location", () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  watchPositionAsync: jest.fn(),
  Accuracy: { BestForNavigation: 1 },
}));
