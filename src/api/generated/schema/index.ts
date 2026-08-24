/**
 * 此文件由 OpenAPI 契约自动生成。
 * 请勿直接修改此文件。
 */

import type { components as coreComponents, operations as coreOperations } from './core'
import type { components as systemComponents, operations as systemOperations } from './system'
import type { components as platformComponents, operations as platformOperations } from './platform'
import type { components as monitorComponents, operations as monitorOperations } from './monitor'
import type { components as agentComponents, operations as agentOperations } from './agent'

export type operations =
  coreOperations
  & systemOperations
  & platformOperations
  & monitorOperations
  & agentOperations

export interface components {
  schemas:
    coreComponents['schemas']
    & systemComponents['schemas']
    & platformComponents['schemas']
    & monitorComponents['schemas']
    & agentComponents['schemas']
}
