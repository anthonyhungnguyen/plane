const parseBooleanFlag = (value: string | undefined, defaultValue: boolean): boolean => {
  if (!value) return defaultValue;

  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
};

// Toggle billing/payments UI on or off. Defaults to hidden for GHN builds
// so the flag does not depend on a machine-local .env at build time.
export const IS_BILLING_FEATURE_ENABLED = parseBooleanFlag(process.env.VITE_BILLING_ENABLED, false);
