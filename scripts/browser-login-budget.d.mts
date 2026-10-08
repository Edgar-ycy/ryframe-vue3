export type LoginReservation = { key: string; generation: string }[]
export type LoginBudget = {
  reserve(
    identity: { tenantId: string; username: string },
    address: string,
  ): Promise<LoginReservation>
  complete(reservation: LoginReservation): Promise<void>
}
export function fixedClientAddress(scope: string | undefined, testId: string): string
export function createLoginBudget(options: {
  statePath: string
  scope: string
  capacity: number
  windowMs: number
  now?: () => number
  sleep?: (milliseconds: number) => Promise<unknown>
  onWait?: (milliseconds: number) => void
}): LoginBudget
export function configuredLoginBudget(environment?: NodeJS.ProcessEnv): LoginBudget
