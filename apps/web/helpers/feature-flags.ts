const parseBooleanFlag = (value: string | undefined, defaultValue: boolean): boolean => {
  if (!value) return defaultValue;

  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
};

// Toggle billing/payments UI on or off. Defaults to enabled.
export const IS_BILLING_FEATURE_ENABLED = parseBooleanFlag(process.env.VITE_BILLING_ENABLED, true);
