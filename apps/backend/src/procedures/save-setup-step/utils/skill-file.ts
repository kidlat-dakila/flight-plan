const NAME_LINE = /^name:.*$/mu

export const renameSkill = (skill: string, name: string): string => skill.replace(NAME_LINE, `name: ${name}`)
