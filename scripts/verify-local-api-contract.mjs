import process from 'node:process'

import { verifyLocalContractState } from './api-contract-state.mjs'

const state = await verifyLocalContractState(process.cwd())
console.log(`本地 OpenAPI ${state.mode === 'candidate' ? '候选态' : '正式态'}校验通过`)
