export default () => {
  const buildProfile = process.env.EAS_BUILD_PROFILE || "development";

  let packageName = "com.line.ar.dev";
  let appName = "AR (Dev)";
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

  if (buildProfile === "production") {
    packageName = "com.line.ar";
    appName = "AR (Prod)";
    iconConfig = {
      icon: "./assets/icons/production/icon.png",
      android: {
        adaptiveIcon: {
          backgroundColor: "#E6F4FE",
          foregroundImage: "./assets/icons/production/android-foreground.png",
          backgroundImage: "./assets/icons/production/android-background.png",
          monochromeImage: "./assets/icons/production/android-monochrome.png",
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
    name: appName,
    slug: "ar",
    version: "1.0.0",
    orientation: "landscape",
    icon: iconConfig.icon,
    scheme: "ar",
    userInterfaceStyle: "automatic",
    ios: {
      supportsTablet: true,
      bundleIdentifier: packageName,
      infoPlist: {
        NSLocationWhenInUseUsageDescription: "This app needs your location.",
        NSMotionUsageDescription:
          "This app uses motion sensors to enable the AR experience.",
      },
    },
    android: {
      package: packageName,
      adaptiveIcon: iconConfig.android.adaptiveIcon,
      predictiveBackGestureEnabled: false,
      permissions: [
        "android.permission.RECORD_AUDIO",
        "android.permission.MODIFY_AUDIO_SETTINGS",
        "android.permission.FOREGROUND_SERVICE",
        "android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK",
        "android.permission.CAMERA",
        "android.permission.ACCESS_COARSE_LOCATION",
        "android.permission.ACCESS_FINE_LOCATION",
      ],
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/favicon.png",
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
    experiments: {
      typedRoutes: true,
    },
    extra: {
      router: {},
      eas: {
        projectId: "8bb1226c-4b9d-4475-8f79-c37fa641e4fb",
      },
    },
    owner: "l-i-n-e",
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
