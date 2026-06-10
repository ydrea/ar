// components/ar/EdgeIndicators.tsx
import { ScreenPosition } from "@/engine/types";
import { Text, View } from "react-native";

interface EdgeIndicatorsProps {
  positions: Array<{
    id: string;
    screen: ScreenPosition | null;
  }>;
  screenWidth: number;
  screenHeight: number;
}

export function EdgeIndicators({
  positions,
  screenWidth,
  screenHeight,
}: EdgeIndicatorsProps) {
  // This is YOUR exact working function, just moved here
  const getEdgeIndicator = (
    screen: ScreenPosition | null,
    width: number,
    height: number,
  ) => {
    if (!screen) return null;
    const margin = 20;
    let x = screen.x;
    let y = screen.y;
    let offscreen = false;
    if (x < 0) {
      x = margin;
      offscreen = true;
    }
    if (x > width) {
      x = width - margin;
      offscreen = true;
    }
    if (y < 0) {
      y = margin;
      offscreen = true;
    }
    if (y > height) {
      y = height - margin;
      offscreen = true;
    }
    return offscreen ? { x, y } : null;
  };

  return (
    <>
      {positions.map((p) => {
        const edge = getEdgeIndicator(p.screen, screenWidth, screenHeight);
        if (!edge) return null;
        return (
          <View
            key={`edge-${p.id}`}
            style={{ position: "absolute", left: edge.x, top: edge.y }}
          >
            <Text style={{ color: "yellow", fontSize: 24 }}>▲</Text>
          </View>
        );
      })}
    </>
  );
}
