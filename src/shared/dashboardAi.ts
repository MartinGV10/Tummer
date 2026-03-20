export type DashboardSeriesPoint = {
  date: string
  value: number
}

export type DashboardAiEmptyState = {
  insight: string
  alert: string
}

export const DASHBOARD_AI_EMPTY_STATE: DashboardAiEmptyState = {
  insight:
    "AI insights will appear once you've logged meals, symptoms, or bowel movements. Add a few entries so the dashboard has enough data to look for patterns.",
  alert:
    "No recent inputs found. Log meals, symptoms, or bowel movements to start receiving personalized insights and alerts.",
}

function sumSeries(series: DashboardSeriesPoint[]): number {
  return series.reduce((acc, item) => acc + item.value, 0)
}

export function hasDashboardInsightInputs(input: {
  weeklyMeals: DashboardSeriesPoint[]
  weeklyBowels: DashboardSeriesPoint[]
  weeklySymptoms: DashboardSeriesPoint[]
}): boolean {
  const weeklyMealsTotal = sumSeries(input.weeklyMeals)
  const weeklyBowelsTotal = sumSeries(input.weeklyBowels)
  const weeklySymptomsTotal = sumSeries(input.weeklySymptoms)

  return weeklyMealsTotal > 0 || weeklyBowelsTotal > 0 || weeklySymptomsTotal > 0
}
