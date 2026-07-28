import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { downloadBlobDirect } from './useDownload'
import {
  downloadExportJob,
  getExportJob,
  type ExportJob,
} from '@/api/modules/exportJob'
import type { ApiResponse } from '@/shared/http/types'
import { translate } from '@/i18n'

const POLL_INTERVAL_MS = 1000
const POLL_TIMEOUT_MS = 120000

function sleep(duration: number): Promise<void> {
  return new Promise(resolve => window.setTimeout(resolve, duration))
}

/** 将创建、轮询和下载统一为一个前端导出交互。 */
export function useAsyncExport() {
  const exporting = ref(false)

  async function exportAndDownload(
    create: () => Promise<ApiResponse<ExportJob>>,
    options: { filename: string },
  ): Promise<void> {
    if (exporting.value) return
    exporting.value = true
    try {
      const created = await create()
      const createdJob = created.data
      if (!createdJob) throw new Error(translate('shell.http.requestFailed'))
      let job: ExportJob = createdJob
      const deadline = Date.now() + POLL_TIMEOUT_MS
      while (job.status === 'queued' || job.status === 'running') {
        if (Date.now() >= deadline) {
          throw new Error(translate('shell.http.requestFailed'))
        }
        await sleep(POLL_INTERVAL_MS)
        const latest: ExportJob | undefined = (await getExportJob(job.id)).data
        if (!latest) throw new Error(translate('shell.http.requestFailed'))
        job = latest
      }
      if (job.status !== 'succeeded') {
        throw new Error(job.error_message || translate('shell.http.requestFailed'))
      }
      downloadBlobDirect(await downloadExportJob(job.id), job.result_file_name || options.filename)
      ElMessage.success(translate('shell.download.success'))
    }
    catch (error) {
      ElMessage.error(error instanceof Error ? error.message : translate('shell.http.requestFailed'))
      throw error
    }
    finally {
      exporting.value = false
    }
  }

  return { exporting, exportAndDownload }
}
