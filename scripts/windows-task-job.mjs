import koffi from 'koffi'

const jobObjectExtendedLimitInformation = 9
const jobObjectLimitKillOnClose = 0x2000

function windowsError(operation, getLastError) {
  return new Error(`${operation} 失败，Windows 错误码 ${getLastError()}`)
}

/** 将当前 worker 放入私有 Job；任务随后启动并继承该 Job。 */
export function enterWindowsTaskJob() {
  const kernel32 = koffi.load('kernel32.dll')
  koffi.pointer('RYFRAME_HANDLE', koffi.opaque())
  const ioCounters = koffi.struct('RYFRAME_IO_COUNTERS', {
    readOperations: 'uint64_t',
    writeOperations: 'uint64_t',
    otherOperations: 'uint64_t',
    readBytes: 'uint64_t',
    writeBytes: 'uint64_t',
    otherBytes: 'uint64_t',
  })
  const basicLimits = koffi.struct('RYFRAME_BASIC_LIMITS', {
    processUserTime: 'int64_t',
    jobUserTime: 'int64_t',
    flags: 'uint32_t',
    minimumWorkingSet: 'uintptr_t',
    maximumWorkingSet: 'uintptr_t',
    activeProcesses: 'uint32_t',
    affinity: 'uintptr_t',
    priorityClass: 'uint32_t',
    schedulingClass: 'uint32_t',
  })
  const extendedLimits = koffi.struct('RYFRAME_EXTENDED_LIMITS', {
    basic: basicLimits,
    io: ioCounters,
    processMemory: 'uintptr_t',
    jobMemory: 'uintptr_t',
    peakProcessMemory: 'uintptr_t',
    peakJobMemory: 'uintptr_t',
  })
  const createJob = kernel32.func(
    'RYFRAME_HANDLE __stdcall CreateJobObjectW(void *attributes, str16 name)',
  )
  const setJobInformation = kernel32.func(
    'int __stdcall SetInformationJobObject(RYFRAME_HANDLE job, int kind, ' +
      'const void *value, uint32_t size)',
  )
  const assignProcess = kernel32.func(
    'int __stdcall AssignProcessToJobObject(RYFRAME_HANDLE job, RYFRAME_HANDLE process)',
  )
  const currentProcess = kernel32.func('RYFRAME_HANDLE __stdcall GetCurrentProcess()')
  const closeHandle = kernel32.func('int __stdcall CloseHandle(RYFRAME_HANDLE handle)')
  const getLastError = kernel32.func('uint32_t __stdcall GetLastError()')

  const job = createJob(null, null)
  if (job === null) throw windowsError('CreateJobObjectW', getLastError)
  const limits = Buffer.alloc(extendedLimits.size)
  limits.writeUInt32LE(jobObjectLimitKillOnClose, basicLimits.members.flags.offset)
  if (!setJobInformation(job, jobObjectExtendedLimitInformation, limits, limits.length)) {
    const error = windowsError('SetInformationJobObject', getLastError)
    closeHandle(job)
    throw error
  }
  if (!assignProcess(job, currentProcess())) {
    const error = windowsError('AssignProcessToJobObject', getLastError)
    closeHandle(job)
    throw error
  }
  return () => {
    if (!closeHandle(job)) throw windowsError('CloseHandle', getLastError)
  }
}
