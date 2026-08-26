export type FlatCrudScalar = string | number | boolean | null | undefined

type ScalarFieldKey<TModel extends object> = {
  [TKey in keyof TModel]-?: TModel[TKey] extends FlatCrudScalar ? Extract<TKey, string> : never
}[keyof TModel]

export interface FlatCrudOption {
  label: string
  value: string | number | boolean
}
interface FlatCrudFieldBase<TModel extends object> {
  key: ScalarFieldKey<TModel>
  label: string
}

export type FlatCrudQueryField<TModel extends object> =
  | (FlatCrudFieldBase<TModel> & {
      kind: 'text'
      placeholder: string
    })
  | (FlatCrudFieldBase<TModel> & {
      kind: 'select'
      placeholder: string
      options: readonly FlatCrudOption[]
    })

export type FlatCrudFormField<TModel extends object> =
  | (FlatCrudFieldBase<TModel> & {
      kind: 'text'
      placeholder: string
      requiredMessage?: string
      disabledOnEdit?: boolean
    })
  | (FlatCrudFieldBase<TModel> & {
      kind: 'number'
      min?: number
      max?: number
    })
  | (FlatCrudFieldBase<TModel> & {
      kind: 'radio'
      options: readonly FlatCrudOption[]
      editOnly?: boolean
    })

interface FlatCrudColumnBase<TRecord extends object> {
  key: ScalarFieldKey<TRecord>
  label: string
  align?: 'left' | 'center' | 'right'
  minWidth?: number
  width?: number
}

export type FlatCrudColumn<TRecord extends object> =
  | (FlatCrudColumnBase<TRecord> & {
      display?: 'text'
    })
  | (FlatCrudColumnBase<TRecord> & {
      display: 'datetime'
      format: (value: string) => string
    })
  | (FlatCrudColumnBase<TRecord> & {
      display: 'status'
      options: readonly FlatCrudOption[]
      positiveValue: string | number | boolean
    })

export interface FlatCrudPermissions {
  list: string
  create: string
  update: string
  remove: string
}

export interface FlatCrudLabels {
  title: string
  add: string
  edit: string
  remove: string
  actions: string
  search: string
  reset: string
  confirm: string
  cancel: string
}
