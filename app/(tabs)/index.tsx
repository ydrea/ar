import { useLanguage } from "@/contexts/LanguageContext";
import { usePermissions } from "@/hooks/usePermissions";
import { Tlog, Slog, Rlog, Plog } from "@/utils/tlog";
import { router } from "expo-router";
import { Magnetometer } from "expo-sensors";
import { useEffect, useState } from "react";

import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";

export default function IndexScreen() {
  const { height: screenHeight } = useWindowDimensions();
  const {
    currentLanguage,
    availableLanguages,
    changeLanguage,
    translate,
    getFlagEmoji,
  } = useLanguage();

  const permissions = usePermissions();
  const [permissionsReady, setPermissionsReady] = useState(false);
  const [ready, setReady] = useState(false);
  const [heading, setHeading] = useState(0);

  const calibrateNorth = async (): Promise<number> =>
    new Promise(async (resolve) => {
      const sub = Magnetometer.addListener(({ x, y }) => {
        let heading = (Math.atan2(y, x) * 180) / Math.PI;
        heading = (heading + 360) % 360;

        sub.remove();
        resolve(heading);
      });
    });

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const granted = await permissions.requestAllPermissions();
      if (!granted) return;
      calibrateNorth().then((heading) => {
        setHeading(heading);
      });
      if (!mounted) return;
      setPermissionsReady(true);
      setReady(true);
    };

    init();

    return () => {
      mounted = false;
    };
  }, []);

  const canStart = ready && permissionsReady && currentLanguage;

  const handleStartAR = () => {
    router.replace("/quat+");
  };

  const getLanguageName = (langCode: string): string => {
    const languageMap: Record<string, string> = {
      hr: "hr",
      en: "en",
      de: "de",
      fr: "fr",
      it: "it",
      es: "es",
    };
    return languageMap[langCode] ?? langCode.toUpperCase();
  };
  // useEffect(() => {
  //   if (!ready) return;
  //   const interval = setInterval(() => {
  //     // const yaw = sensorHub.getSnapshot()?.yaw ?? 0;
  //     // setHeading(yaw);
  //   }, 100);
  //   return () => clearInterval(interval);
  // }, [ready]);

  return (
    <View style={styles.container}>
      <View style={styles.textGroup}>
        <Text style={styles.calibrationText}>
          {translate("compassCalibration")} ({heading.toFixed(0)}°)
        </Text>
      </View>

      {!ready && <ActivityIndicator size="large" color="#ff4412" />}

      {ready && (
        <View style={styles.readyContainer}>
          <Text style={styles.sectionTitle}>{translate("selectLanguage")}</Text>

          <View
            style={[styles.scrollContainer, { maxHeight: screenHeight * 0.4 }]}
          >
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={true}
            >
              {availableLanguages.map((lang: string) => {
                const flag = getFlagEmoji(lang);
                const isSelected = currentLanguage === lang;

                return (
                  <TouchableOpacity
                    key={lang}
                    onPress={() => changeLanguage(lang)}
                    style={[
                      styles.languageButton,
                      {
                        backgroundColor: isSelected ? "#666aaa" : "#333",
                      },
                    ]}
                  >
                    <Text style={styles.flagText}>{flag}</Text>
                    <Text style={styles.languageText}>
                      {getLanguageName(lang)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          <TouchableOpacity
            onPress={handleStartAR}
            disabled={!canStart}
            style={[
              styles.startButton,
              {
                backgroundColor: canStart ? "#666aaa" : "#666",
              },
            ]}
          >
            <Text style={styles.startButtonText}>{translate("startAR")}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#010101",
    gap: 15,
  },

  textGroup: {
    alignItems: "center",
    marginBottom: 20,
  },

  calibrationText: {
    color: "white",
    fontSize: 16,
  },

  readyContainer: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },

  sectionTitle: {
    color: "white",
    marginBottom: 6,
    fontSize: 12,
    fontWeight: "600",
  },

  scrollContainer: {
    width: "100%",
    marginBottom: 4,
  },

  scrollContent: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 14,
  },

  languageButton: {
    width: "14%",
    padding: 4,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  flagText: {
    fontSize: 18,
    marginRight: 8,
  },

  languageText: {
    color: "white",
    fontSize: 14,
  },

  startButton: {
    marginTop: 20,
    width: "80%",
    maxWidth: 320,
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },

  startButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 12,
  },
});
