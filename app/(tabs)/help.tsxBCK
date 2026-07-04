// app/HelpScreen.tsx
import React from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { FadeIn, SlideInRight } from "react-native-reanimated";
import { useLanguage } from "@/contexts/LanguageContext";
import Svg, {
  Circle,
  Path,
  Rect,
  Line,
  Text as SvgText,
  G,
  Defs,
  LinearGradient,
  Stop,
} from "react-native-svg";

const { width, height } = Dimensions.get("window");

interface HelpScreenProps {
  onClose: () => void;
}

// SVG Icons
const HandIcon = ({
  color,
  direction,
}: {
  color: string;
  direction?: "up" | "down" | "left" | "right" | "horizontal";
}) => (
  <Svg width={40} height={40} viewBox="0 0 24 24">
    {direction === "horizontal" ? (
      <>
        <Path
          d="M3 12L8 7M3 12L8 17"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
        />
        <Path
          d="M21 12L16 7M21 12L16 17"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
        />
        <Circle cx="8" cy="12" r="1.5" fill={color} />
        <Circle cx="16" cy="12" r="1.5" fill={color} />
      </>
    ) : (
      <>
        <Path
          d="M12 3L12 21"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
        />
        <Path
          d="M7 8L12 3L17 8"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
        />
        <Path
          d="M7 16L12 21L17 16"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
        />
        <Circle cx="12" cy="12" r="1.5" fill={color} />
      </>
    )}
  </Svg>
);

const MountainIcon = ({ color }: { color: string }) => (
  <Svg width={32} height={32} viewBox="0 0 24 24">
    <Path d="M4 20L12 4L20 20" stroke={color} strokeWidth={2} fill="none" />
    <Path d="M8 14L12 10L16 14" stroke={color} strokeWidth={2} fill="none" />
  </Svg>
);

const NearIcon = ({ color }: { color: string }) => (
  <Svg width={32} height={32} viewBox="0 0 24 24">
    <Circle cx="12" cy="12" r="8" stroke={color} strokeWidth={2} fill="none" />
    <Path d="M12 8L12 16M8 12L16 12" stroke={color} strokeWidth={2} />
  </Svg>
);

const FarIcon = ({ color }: { color: string }) => (
  <Svg width={32} height={32} viewBox="0 0 24 24">
    <Circle cx="12" cy="12" r="8" stroke={color} strokeWidth={2} fill="none" />
    <Path d="M12 4L12 8M12 16L12 20" stroke={color} strokeWidth={2} />
  </Svg>
);

const ZoomIcon = ({ color }: { color: string }) => (
  <Svg width={32} height={32} viewBox="0 0 24 24">
    <Circle cx="11" cy="11" r="7" stroke={color} strokeWidth={2} fill="none" />
    <Path
      d="M16 16L21 21"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
    />
    <Path d="M11 8L11 14M8 11L14 11" stroke={color} strokeWidth={2} />
  </Svg>
);

const FOVIcon = ({ color }: { color: string }) => (
  <Svg width={32} height={32} viewBox="0 0 24 24">
    <Path d="M4 12L20 12" stroke={color} strokeWidth={2} />
    <Path d="M12 4L12 20" stroke={color} strokeWidth={2} />
    <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth={2} fill="none" />
    <Path
      d="M8 8L10 10M16 16L14 14"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
    />
  </Svg>
);

const GestureCard = ({
  title,
  description,
  icon,
  color,
  delay,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  delay: number;
}) => (
  <Animated.View
    entering={SlideInRight.delay(delay).springify()}
    style={[styles.gestureCard, { borderLeftColor: color }]}
  >
    <View style={styles.gestureIcon}>{icon}</View>
    <View style={styles.gestureContent}>
      <Text style={[styles.gestureTitle, { color }]}>{title}</Text>
      <Text style={styles.gestureDescription}>{description}</Text>
    </View>
  </Animated.View>
);

export default function HelpScreen() {
  const { translate } = useLanguage();

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <Animated.View entering={FadeIn} style={styles.header}>
          <Text style={styles.title}>{translate("helpTitle")}</Text>
        </Animated.View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.contentContainer}
        >
          <Text style={styles.subtitle}>{translate("helpSubtitle")}</Text>

          {/* MAX Distance - Top Finger */}
          <GestureCard
            title={translate("maxDistanceTitle")}
            description={translate("maxDistanceDesc")}
            icon={<HandIcon color="#2196F3" />}
            color="#2196F3"
            delay={100}
          />

          {/* MIN Distance - Bottom Finger */}
          <GestureCard
            title={translate("minDistanceTitle")}
            description={translate("minDistanceDesc")}
            icon={<HandIcon color="#4CAF50" />}
            color="#4CAF50"
            delay={200}
          />

          {/* Symmetric Zoom */}
          <GestureCard
            title={translate("cameraZoomTitle")}
            description={translate("cameraZoomDesc")}
            icon={<HandIcon color="#FF9800" direction="horizontal" />}
            color="#FF9800"
            delay={300}
          />

          {/* Horizontal FOV */}
          <GestureCard
            title={translate("fovTitle")}
            description={translate("fovDesc")}
            icon={<HandIcon color="#00BCD4" direction="horizontal" />}
            color="#00BCD4"
            delay={400}
          />

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>
            {translate("visualFeedbackTitle")}
          </Text>

          <View style={styles.feedbackGrid}>
            <View style={styles.feedbackItem}>
              <View
                style={[
                  styles.feedbackBadge,
                  {
                    backgroundColor: "rgba(33, 150, 243, 0.2)",
                    borderColor: "#2196F3",
                  },
                ]}
              >
                <FarIcon color="#2196F3" />
              </View>
              <Text style={styles.feedbackLabel}>
                {translate("blueMaxDistance")}
              </Text>
            </View>

            <View style={styles.feedbackItem}>
              <View
                style={[
                  styles.feedbackBadge,
                  {
                    backgroundColor: "rgba(76, 175, 80, 0.2)",
                    borderColor: "#4CAF50",
                  },
                ]}
              >
                <NearIcon color="#4CAF50" />
              </View>
              <Text style={styles.feedbackLabel}>
                {translate("greenMinDistance")}
              </Text>
            </View>

            <View style={styles.feedbackItem}>
              <View
                style={[
                  styles.feedbackBadge,
                  {
                    backgroundColor: "rgba(255, 152, 0, 0.2)",
                    borderColor: "#FF9800",
                  },
                ]}
              >
                <ZoomIcon color="#FF9800" />
              </View>
              <Text style={styles.feedbackLabel}>
                {translate("orangeZoom")}
              </Text>
            </View>

            <View style={styles.feedbackItem}>
              <View
                style={[
                  styles.feedbackBadge,
                  {
                    backgroundColor: "rgba(0, 188, 212, 0.2)",
                    borderColor: "#00BCD4",
                  },
                ]}
              >
                <FOVIcon color="#00BCD4" />
              </View>
              <Text style={styles.feedbackLabel}>{translate("cyanFov")}</Text>
            </View>
          </View>

          <View style={styles.tipBox}>
            <Text style={styles.tipTitle}>{translate("proTipsTitle")}</Text>
            <Text style={styles.tipText}>{translate("proTip1")}</Text>
            <Text style={styles.tipText}>{translate("proTip2")}</Text>
            <Text style={styles.tipText}>{translate("proTip3")}</Text>
            <Text style={styles.tipText}>{translate("proTip4")}</Text>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>{translate("helpFooter")}</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#00ffff",
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  closeButtonText: {
    fontSize: 20,
    color: "white",
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  subtitle: {
    fontSize: 16,
    color: "#cccccc",
    marginBottom: 24,
    lineHeight: 22,
  },
  gestureCard: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  gestureIcon: {
    width: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  gestureContent: {
    flex: 1,
    marginLeft: 12,
  },
  gestureTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  gestureDescription: {
    fontSize: 13,
    color: "#aaaaaa",
    lineHeight: 18,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    marginVertical: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
    marginBottom: 16,
  },
  feedbackGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 24,
  },
  feedbackItem: {
    flexDirection: "row",
    alignItems: "center",
    width: "48%",
    marginBottom: 12,
  },
  feedbackBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  feedbackLabel: {
    fontSize: 12,
    color: "#cccccc",
    flex: 1,
  },
  tipBox: {
    backgroundColor: "rgba(0, 255, 255, 0.1)",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(0, 255, 255, 0.3)",
    marginBottom: 24,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#00ffff",
    marginBottom: 8,
  },
  tipText: {
    fontSize: 13,
    color: "#cccccc",
    marginBottom: 6,
    lineHeight: 18,
  },
  footer: {
    alignItems: "center",
    paddingTop: 20,
  },
  footerText: {
    fontSize: 11,
    color: "#666666",
    textAlign: "center",
  },
});
