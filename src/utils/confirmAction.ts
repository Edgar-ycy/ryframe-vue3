import { ElMessageBox, type ElMessageBoxOptions } from 'element-plus'

export function isConfirmationCancellation(error: unknown): boolean {
  return error === 'cancel' || error === 'close'
}

/** 显示确认对话框；非用户取消引发的异常仍继续抛出。 */
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
