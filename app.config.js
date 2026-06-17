export default ({ config }) => {
  const buildProfile = process.env.EAS_BUILD_PROFILE;

  // Import and extend the base configuration from app.json
  const baseConfig = {
    ...config,
    ios: {
      ...config.ios,
      infoPlist: {
        NSLocationWhenInUseUsageDescription: "This app needs your location.",
        NSMotionUsageDescription:
          "This app uses motion sensors to enable the AR experience.",
      },
    },
    android: {
      ...config.android,
    },
    plugins: [
      "expo-router",
      "expo-asset",
      "expo-screen-orientation",
      "expo-web-browser",
      [
        "expo-camera",
        {
          cameraPermission:
            "Allow $(PRODUCT_NAME) to access your camera for AR features",
        },
      ],
      [
        "expo-location",
        {
          locationAlwaysAndWhenInUsePermission:
            "This app needs your location to provide location-based AR content.",
        },
      ],
      [
        "expo-sensors",
        {
          motionPermission:
            "This app uses motion sensors to enable the AR experience.",
        },
      ],
      [
        "expo-splash-screen",
        {
          image: "./assets/generated/splash-android.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#dfdfdf",
          dark: {
            image: "./assets/generated/splash-dark.png",
            backgroundColor: "#202020",
          },
        },
      ],
    ],
  };

  // Icon configuration based on build profile
  let iconConfig = {
    icon: "./assets/generated/icon.png",
    android: {
      adaptiveIcon: {
        backgroundColor: "#E6F4FE",
        foregroundImage: "./assets/generated/android-foreground.png",
        backgroundImage: "./assets/generated/android-background.png",
        monochromeImage: "./assets/generated/android-monochrome.png",
      },
    },
  };

  if (buildProfile === "development") {
    iconConfig = {
      icon: "./assets/icons/development/icon.png",
      android: {
        adaptiveIcon: {
          backgroundColor: "#E6F4FE",
          foregroundImage: "./assets/icons/development/android-foreground.png",
          backgroundImage: "./assets/icons/development/android-background.png",
          monochromeImage: "./assets/icons/development/android-monochrome.png",
        },
      },
    };
  } else if (buildProfile === "preview") {
    iconConfig = {
      icon: "./assets/icons/preview/icon.png",
      android: {
        adaptiveIcon: {
          backgroundColor: "#E6F4FE",
          foregroundImage: "./assets/icons/preview/android-foreground.png",
          backgroundImage: "./assets/icons/preview/android-background.png",
          monochromeImage: "./assets/icons/preview/android-monochrome.png",
        },
      },
    };
  }

  return {
    ...baseConfig,
    name:
      buildProfile === "development"
        ? "AR (Dev)"
        : buildProfile === "preview"
          ? "AR (Preview)"
          : "AR",
    icon: iconConfig.icon,
    orientation: "landscape",
    android: {
      ...baseConfig.android,
      package:
        buildProfile === "development"
          ? "com.line.ar.dev"
          : buildProfile === "preview"
            ? "com.line.ar.preview"
            : "com.line.ar",
      adaptiveIcon: iconConfig.android.adaptiveIcon,
    },
    // Updates configuration - moved from app.json
    updates: {
      url: "https://u.expo.dev/8bb1226c-4b9d-4475-8f79-c37fa641e4fb",
      fallbackToCacheTimeout: 0,
      checkAutomatically:
        buildProfile === "development" || buildProfile === "preview"
          ? "ON_LOAD"
          : "ON_ERROR_RECOVERY",
      ...(buildProfile === "preview" && { channel: "preview" }),
    },
    runtimeVersion: {
      policy: "appVersion",
    },
  };
};
