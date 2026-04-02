/**
 * Display bands for risk scores (labeling only; does not change engine math).
 * Low 0–39, Medium 40–59, High 60–79, Critical 80+.
 */
export type RiskScoreLabel = "Low" | "Medium" | "High" | "Critical";

export function getRiskLabel(score: number): RiskScoreLabel {
  if (!Number.isFinite(score)) return "Low";
  if (score >= 80) return "Critical";
  if (score >= 60) return "High";
  if (score >= 40) return "Medium";
  return "Low";
}
