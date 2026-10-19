export const SETTINGS_SECTIONS = ["agents", "forges", "repositories", "review"] as const

export type SettingsSection = (typeof SETTINGS_SECTIONS)[number]
