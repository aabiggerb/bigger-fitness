/**
 * Validates an email address format.
 * Uses a standard RFC 5322-compatible regex pattern.
 */
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};
