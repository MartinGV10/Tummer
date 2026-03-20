export const GENDER_OPTIONS = [
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
  { value: 'non_binary', label: 'Non-binary' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
] as const

export function normalizeGenderValue(value: string | null | undefined): string | null {
  const normalized = (value ?? '').trim().toLowerCase()
  if (!normalized) return null

  if (normalized === 'female') return 'female'
  if (normalized === 'male') return 'male'
  if (normalized === 'non-binary' || normalized === 'non binary' || normalized === 'non_binary') {
    return 'non_binary'
  }
  if (
    normalized === 'prefer not to say' ||
    normalized === 'prefer-not-to-say' ||
    normalized === 'prefer_not_to_say'
  ) {
    return 'prefer_not_to_say'
  }

  return normalized
}
