// utils/updates.js
import * as Updates from "expo-updates";
import { Alert } from "react-native";

/**
 * Check for and apply updates if available
 * @param channel The update channel to check (e.g., 'preview', 'production')
 * @param silent If true, don't show alerts to the user
 */
export async function checkForUpdates(channel, silent = false) {
  try {
    // If channel specified, verify we're on the right one first
    if (channel) {
      const currentInfo = await getCurrentUpdateInfo();
      if (
        currentInfo.channel !== channel &&
        currentInfo.channel !== "unknown"
      ) {
        if (!silent) {
          console.log(
            `Current channel (${currentInfo.channel}) doesn't match requested (${channel})`,
          );
        }
        return false;
      }
    }

    const update = await Updates.checkForUpdateAsync();

    if (update.isAvailable) {
      if (!silent) {
        Alert.alert(
          "Update Available",
          "A new version is available. Restarting app...",
          [{ text: "OK" }],
        );
      }

      await Updates.fetchUpdateAsync();
      await Updates.reloadAsync();
      return true;
    } else {
      if (!silent) {
        console.log("No updates available");
      }
      return false;
    }
  } catch (error) {
    if (!silent) {
      console.error("Update check failed:", error);
      Alert.alert(
        "Update Error",
        "Failed to check for updates. Using cached version.",
      );
    }
    return false;
  }
}

/**
 * Get current update information
 */
export async function getCurrentUpdateInfo() {
  try {
    const update = await Updates.getCurrentUpdateAsync();
    return {
      updateId: update?.updateId ?? "unknown",
      channel: update?.channel ?? "unknown",
      runtimeVersion: update?.runtimeVersion ?? "unknown",
      isEmbeddedLaunch: update?.isEmbeddedLaunch ?? true,
    };
  } catch (error) {
    console.log("getCurrentUpdateAsync not available in development");
    return {
      updateId: "unknown",
      channel: "unknown",
      runtimeVersion: "unknown",
      isEmbeddedLaunch: true,
    };
  }
}

/**
 * Configure update behavior based on environment
 * @param buildProfile The build profile (development, preview, production)
 */
export function configureUpdates(buildProfile) {
  // Only configure updates in production builds
  if (__DEV__ === false) {
    // Set update check interval (in seconds)
    Updates.checkForUpdateAsync();

    // Listen for update events
    if (Updates.addListener) {
      Updates.addListener((event) => {
        if (event.type === Updates.UpdateEventType.UPDATE_AVAILABLE) {
          console.log("Update available:", event.updateId);
        }
      });
    }
  }

  // Log current update info for debugging
  getCurrentUpdateInfo().then((info) => {
    console.log("Current update info:", {
      ...info,
      buildProfile: buildProfile || "unknown",
    });
  });
}

/**
 * Get the appropriate update channel based on build profile
 */
export function getUpdateChannel(buildProfile) {
  switch (buildProfile) {
    case "development":
      return "development";
    case "preview":
      return "preview";
    default:
      return "production";
  }
}
