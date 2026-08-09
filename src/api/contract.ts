import type { components, operations } from './generated/schema'

type SchemaMap = components['schemas']

export type ApiSchema<Name extends keyof SchemaMap> = SchemaMap[Name]
export type ApiOperation<Name extends keyof operations> = operations[Name]

export type OperationQuery<Name extends keyof operations> =
  ApiOperation<Name> extends { parameters: { query?: infer Query } }
    ? Exclude<Query, undefined>
    : never

export type OperationPath<Name extends keyof operations> =
  ApiOperation<Name> extends { parameters: { path?: infer Path } }
    ? Exclude<Path, undefined>
    : never

export type OperationJsonBody<Name extends keyof operations> =
  ApiOperation<Name> extends {
    requestBody: { content: { 'application/json': infer Body } }
  }
    ? Body
    : never

type JsonContent<Response> = Response extends {
  content: { 'application/json': infer Body }
}
  ? Body
  : never

type ResponseAt<Responses, Status extends PropertyKey> = Status extends keyof Responses
  ? Responses[Status]
  : never

export type OperationJsonResponse<Name extends keyof operations> =
  ApiOperation<Name> extends { responses: infer Responses }
    ? JsonContent<
      | ResponseAt<Responses, 200>
      | ResponseAt<Responses, 201>
      | ResponseAt<Responses, 202>
    >
    : never

export type OperationData<Name extends keyof operations> =
  OperationJsonResponse<Name> extends { data?: infer Data }
    ? NonNullable<Data>
    : never

export type OperationRows<Name extends keyof operations> =
  OperationData<Name> extends { items: infer Items }
    ? Items
    : never
