export function createRequestBudget(options: {
  capacity: number
  windowMs: number
  now?: () => number
  sleep: (milliseconds: number) => Promise<void>
}): {
  record(): void
  waitForAvailable(required: number): Promise<void>
}
