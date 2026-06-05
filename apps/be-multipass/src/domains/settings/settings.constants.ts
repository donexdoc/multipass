export const SETTINGS_DEFAULTS = {
  DOMAIN_RESOLVE_INTERVAL: '0 */6 * * *',
} as const

export type SettingKey = keyof typeof SETTINGS_DEFAULTS
