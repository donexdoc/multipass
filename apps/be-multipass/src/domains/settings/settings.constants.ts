export const SETTINGS_DEFAULTS = {
  DOMAIN_RESOLVE_INTERVAL: '0 */6 * * *',
  BGP_ENABLED: 'false',
  BGP_NEXT_HOP: '',
  BGP_GOBGP_API_URL: 'host.docker.internal:50051',
} as const

export type SettingKey = keyof typeof SETTINGS_DEFAULTS
