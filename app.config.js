export default ({ config }) => {
  const buildProfile = process.env.EAS_BUILD_PROFILE;

  // Determine package name
  let packageName = "com.line.ar";
  let appName = "AR";
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
    packageName = "com.line.ar.dev";
    appName = "AR (Dev)";
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
    packageName = "com.line.ar.preview";
    appName = "AR (Preview)";
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
    ...config,
    name: appName,
    icon: iconConfig.icon,
    orientation: "landscape", // Override portrait from app.json
    ios: {
      ...config.ios,
      bundleIdentifier: packageName,
      infoPlist: {
        NSLocationWhenInUseUsageDescription: "This app needs your location.",
        NSMotionUsageDescription:
          "This app uses motion sensors to enable the AR experience.",
      },
    },
    android: {
      ...config.android,
      package: packageName, // This overrides app.json
      adaptiveIcon: iconConfig.android.adaptiveIcon,
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
