/**
 * Generates a unique ID combining a base-36 timestamp with random hex characters.
 * More robust than Date.now().toString() alone — virtually zero collision risk.
 *
 * Format: "timestamp36-randomhex" e.g. "m1abc2d-3f7a9b1e"
 */
export const generateId = (): string => {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 10);
  return `${timestamp}-${randomPart}`;
};
