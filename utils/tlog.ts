// utils/tlog.ts - intentionally silent production logger

type Logger = (...args: unknown[]) => void;

const noop: Logger = () => {};

export const Tlog = noop;
export const Slog = noop;
export const Rlog = noop;
export const Plog = noop;
export const Elog = noop;
export const Dlog = noop;
export const PlogPerf = (_label: string, _startTime: number): void => {};

export default {
  Tlog,
  Slog,
  Rlog,
  Plog,
  Elog,
  Dlog,
  PlogPerf,
};
