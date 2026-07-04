// utils/tlog.ts - environment-aware logging with throttling
const createLogger = (
  throttleMs: number,
  level: "log" | "warn" | "error" = "log",
) => {
  let last = 0;

  return (...args: any[]) => {
    // In production, only log errors and warnings
    if (!__DEV__ && level === "log") return;

    const now = Date.now();
    if (now - last > throttleMs) {
      last = now;

      switch (level) {
        case "error":
          console.error(...args);
          break;
        case "warn":
          console.warn(...args);
          break;
        default:
          console.log(...args);
      }
    }
  };
};

// Main logging functions
export const Tlog = createLogger(10000, "log"); // Regular logs (dev only)
export const Slog = createLogger(8000, "log"); // Regular logs (dev only)
export const Rlog = createLogger(4000, "log"); // Regular logs (dev only)
export const Plog = createLogger(2000, "error"); // Errors (always show)

// Elog - Error logger (always shows, no throttling)
export const Elog = (...args: any[]) => {
  console.error("[❌ ERROR]", ...args);
};

// Additional utility for debugging
export const Dlog = (...args: any[]) => {
  if (!__DEV__) return;
  console.log("[🐛 DEBUG]", ...args);
};

// Performance logging
export const PlogPerf = (label: string, startTime: number) => {
  if (!__DEV__) return;
  const duration = (Date.now() - startTime).toFixed(2);
  console.log(`[⏱️ PERF] ${label}: ${duration}ms`);
};

// Export all
export default {
  Tlog,
  Slog,
  Rlog,
  Plog,
  Elog,
  Dlog,
  PlogPerf,
};
