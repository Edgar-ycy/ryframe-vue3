export const restoreSpecs: string[]
export function realTestSelection(
  bindings: string | undefined,
  fixture: string,
  root?: string,
): {
  selection: { testIgnore: string[] } | { testMatch: string[] }
  reporter: { bindingPath: string; bindingSha256: string } | undefined
}
