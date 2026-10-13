export const SETTINGS_SECTIONS = ["agents", "forges", "configuration", "repositories"] as const

export type SettingsSection = (typeof SETTINGS_SECTIONS)[number]
