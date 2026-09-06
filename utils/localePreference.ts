export const localePreferenceKey = 'eventscope:locale'
export const supportedLocales = ['en', 'ru'] as const
export type SupportedLocale = (typeof supportedLocales)[number]

export const isSupportedLocale = (value: unknown): value is SupportedLocale =>
  typeof value === 'string' && supportedLocales.includes(value as SupportedLocale)

export const readLocalePreference = (storage: Pick<Storage, 'getItem'>): SupportedLocale | undefined => {
  try {
    const value = storage.getItem(localePreferenceKey)
    return isSupportedLocale(value) ? value : undefined
  } catch {
    return undefined
  }
}

export const writeLocalePreference = (
  storage: Pick<Storage, 'setItem'>,
  locale: SupportedLocale
): boolean => {
  try {
    storage.setItem(localePreferenceKey, locale)
    return true
  } catch {
    return false
  }
}
