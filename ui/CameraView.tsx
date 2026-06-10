import { CameraView as ARMCamera, useCameraPermissions } from "expo-camera";
import { StyleSheet, Text, View } from "react-native";

export function CameraView() {
  const [permission, requestPermission] = useCameraPermissions();
  if (!permission) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Loading camera...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No access to camera</Text>
      </View>
    );
  }

  return <ARMCamera style={styles.camera} facing="back" mode="video" />;
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "black",
    justifyContent: "center",
    alignItems: "center",
  },
  camera: {
    ...StyleSheet.absoluteFill,
  },
  errorText: {
    color: "white",
    textAlign: "center",
    paddingHorizontal: 24,
    fontSize: 14,
  },
});
