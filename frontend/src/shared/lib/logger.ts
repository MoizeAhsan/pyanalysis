/** Console logging that stays quiet in production builds except for errors. */
/* eslint-disable no-console */
const verbose = import.meta.env.DEV;

export const logger = {
  debug: (...args: unknown[]): void => {
    if (verbose) console.debug(...args);
  },
  warn: (...args: unknown[]): void => {
    if (verbose) console.warn(...args);
  },
  error: (...args: unknown[]): void => {
    console.error(...args);
  },
};
