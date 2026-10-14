export const SETTINGS_SECTIONS = ["agents", "forges", "repositories"] as const

export type SettingsSection = (typeof SETTINGS_SECTIONS)[number]
