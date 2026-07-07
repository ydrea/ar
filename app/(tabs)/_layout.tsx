import { SymbolView } from "expo-symbols";
import { Link, Tabs } from "expo-router";
import { Platform, Pressable } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import Colors from "@/constants/Colors";
import { useColorScheme } from "@/components/useColorScheme";
import { useClientOnlyValue } from "@/components/useClientOnlyValue";

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme].tint,
        // Disable the static render of the header on web
        // to prevent a hydration error in React Navigation v6.
        headerShown: useClientOnlyValue(false, true),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          headerShown: false,
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons
              name={focused ? "home-variant" : "home-outline"}
              size={28}
              color={color}
            />
          ),
          headerRight: () => (
            <Link href="/modal" asChild>
              <Pressable style={{ marginRight: 15 }}>
                {({ pressed }) => (
                  <SymbolView
                    name={{ ios: "info.circle", android: "info", web: "info" }}
                    size={25}
                    tintColor={Colors[colorScheme].text}
                    style={{ opacity: pressed ? 0.5 : 1 }}
                  />
                )}
              </Pressable>
            </Link>
          ),
        }}
      />
      <Tabs.Screen
        name="gestbeta"
        options={{
          title: "AR Beta",
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons
              name={focused ? "line-scan" : "scan-helper"}
              size={28}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="log"
        options={{
          title: "LOG",
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons
              name={focused ? "help-rhombus" : "help-rhombus-outline"}
              size={28}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
