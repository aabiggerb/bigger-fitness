/**
 * Calculates Body Mass Index (BMI).
 * @param weightKg - Weight in kilograms
 * @param heightCm - Height in centimeters
 * @returns BMI rounded to 1 decimal place, or undefined if inputs are invalid
 */
export const calculateBMI = (weightKg: number, heightCm: number): number | undefined => {
  if (!weightKg || !heightCm || weightKg <= 0 || heightCm <= 0) return undefined;
  const heightM = heightCm / 100;
  return Math.round((weightKg / (heightM * heightM)) * 10) / 10;
};

/**
 * Returns a BMI classification label.
 */
export const getBMICategory = (bmi: number): { label: string; color: string } => {
  if (bmi < 18.5) return { label: 'Bajo peso', color: '#FFA726' };
  if (bmi < 25) return { label: 'Normal', color: '#64ffda' };
  if (bmi < 30) return { label: 'Sobrepeso', color: '#FFA726' };
  return { label: 'Obesidad', color: '#ff6b6b' };
};
