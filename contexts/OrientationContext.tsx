// // contexts/OrientationContext.tsx
// import { useOrientation } from "@/hooks/useOrientation";
// import React, { createContext, useContext, useMemo } from "react";

// const defaultOrientation = {
//   yaw: 0,
//   pitch: 0,
//   roll: 0,
//   landscapeMode: "left",
//   isReady: false,
// };

// const OrientationContext = createContext(defaultOrientation);

// export function OrientationProvider({
//   children,
// }: {
//   children: React.ReactNode;
// }) {
//   const orientation = useOrientation();

//   // Memoize to prevent unnecessary re-renders
//   const contextValue = useMemo(
//     () => orientation,
//     [
//       orientation.yaw,
//       orientation.pitch,
//       orientation.roll,
//       orientation.landscapeMode,
//       orientation.isReady,
//     ],
//   );

//   return (
//     <OrientationContext.Provider value={contextValue}>
//       {children}
//     </OrientationContext.Provider>
//   );
// }

// export const useOrientationRef = () => {
//   const ctx = useContext(OrientationContext);
//   return ctx;
// };
// // import { useOrientation } from "@/hooks/useOrientation";
// // import React, { createContext, useContext } from "react";
// // const OrientationContext = createContext<any>(null);

// // export function OrientationProvider({
// //   children,
// // }: {
// //   children: React.ReactNode;
// // }) {
// //   const orientationRef = useOrientation();

// //   return (
// //     <OrientationContext.Provider value={orientationRef}>
// //       {children}
// //     </OrientationContext.Provider>
// //   );
// // }

// // export function useOrientationRef() {
// //   const ctx = useContext(OrientationContext);

// //   if (!ctx) {
// //     throw new Error("OrientationProvider missing");
// //   }

// //   return ctx;
// // }
// contexts/OrientationContext.tsx
import { useOrientationSensors } from "@/hooks/useOrientation";
import React, { createContext, useContext } from "react";

const OrientationContext = createContext<any>(null);

export function OrientationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const orientation = useOrientationSensors();

  // Don't memoize - just pass the value directly
  // The useOrientation hook already handles update throttling
  return (
    <OrientationContext.Provider value={orientation}>
      {children}
    </OrientationContext.Provider>
  );
}

export const useOrientationRef = () => {
  const ctx = useContext(OrientationContext);
  if (!ctx) throw new Error("OrientationProvider missing");
  return ctx;
};
