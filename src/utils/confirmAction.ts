import { ElMessageBox, type ElMessageBoxOptions } from 'element-plus'

export function isConfirmationCancellation(error: unknown): boolean {
  return error === 'cancel' || error === 'close'
}

/** Show a confirmation dialog while preserving non-cancellation failures. */
export async function confirmAction(
  message: ElMessageBoxOptions['message'],
  title: string,
  options: ElMessageBoxOptions = {},
): Promise<boolean> {
  try {
    await ElMessageBox.confirm(message, title, options)
    return true
  }
  catch (error) {
    if (isConfirmationCancellation(error)) return false
    throw error
  }
}
