import type { PageQuery, PageResponse, Id } from '@/shared/http/types'

export interface FlatCrudAdapter<
  TRecord extends object,
  TQuery extends PageQuery,
  TCreate extends object,
  TUpdate extends object,
> {
  list: (query: Readonly<TQuery>, signal: AbortSignal) => Promise<PageResponse<TRecord>>
  detail: (id: Id, signal: AbortSignal) => Promise<TRecord>
  create: (input: TCreate) => Promise<void>
  update: (id: Id, input: TUpdate) => Promise<void>
  remove: (id: Id) => Promise<void>
}
export interface FlatCrudMessages<TRecord extends object> {
  addSuccess: string
  addTitle: string
  deleteConfirm: (record: TRecord) => string
  deleteSuccess: string
  detailMissing: string
  editTitle: string
  updateSuccess: string
  warningTitle: string
}

export interface FlatCrudResource<
  TRecord extends object,
  TQuery extends PageQuery,
  TForm extends object,
  TCreate extends object,
  TUpdate extends object,
> {
  adapter: FlatCrudAdapter<TRecord, TQuery, TCreate, TUpdate>
  createInput: (form: Readonly<TForm>) => TCreate
  editForm: (record: TRecord) => TForm
  emptyForm: () => TForm
  initialQuery: () => TQuery
  key: string
  messages: FlatCrudMessages<TRecord>
  recordId: (record: TRecord) => Id
  updateInput: (form: Readonly<TForm>) => TUpdate
}

export function defineFlatCrudResource<
  TRecord extends object,
  TQuery extends PageQuery,
  TForm extends object,
  TCreate extends object,
  TUpdate extends object,
>(
  resource: FlatCrudResource<TRecord, TQuery, TForm, TCreate, TUpdate>,
): FlatCrudResource<TRecord, TQuery, TForm, TCreate, TUpdate> {
  return resource
}
