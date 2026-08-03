import type { ApiSchema } from '@/api/contract'

/** 统一选择器候选项。 */
export type SelectOption = ApiSchema<'OptionItem'>

/** 统一选择器查询结果。 */
export type SelectOptionList = ApiSchema<'OptionList'>
