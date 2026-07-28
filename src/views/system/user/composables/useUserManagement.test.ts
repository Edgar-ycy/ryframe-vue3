import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { DeptNode } from '@/api/modules/dept'
import type { RoleRecord } from '@/api/modules/role'
import type { UserRecord } from '@/api/modules/user'
import { useUserManagement } from './useUserManagement'

const mocks = vi.hoisted(() => ({
  confirmAction: vi.fn(),
  deleteUser: vi.fn(),
  downloadBlob: vi.fn(),
  exportUser: vi.fn(),
  getDeptTree: vi.fn(),
  listRoleNoPage: vi.fn(),
  listUser: vi.fn(),
  messageSuccess: vi.fn(),
  mountedCallbacks: [] as Array<() => void>,
  updateUserStatus: vi.fn(),
  userStore: { roles: [] as string[], permissions: [] as string[] },
}))

vi.mock('vue', async (importOriginal) => {
  const vue = await importOriginal<typeof import('vue')>()
  return {
    ...vue,
    onMounted: (callback: () => void) => mocks.mountedCallbacks.push(callback),
  }
})

vi.mock('element-plus', () => ({
  ElMessage: { success: mocks.messageSuccess },
}))

vi.mock('@/api/modules/user', () => ({
  deleteUser: mocks.deleteUser,
  exportUser: mocks.exportUser,
  listUser: mocks.listUser,
  updateUserStatus: mocks.updateUserStatus,
}))

vi.mock('@/api/modules/role', () => ({
  listRoleNoPage: mocks.listRoleNoPage,
}))

vi.mock('@/api/modules/dept', () => ({
  getDeptTree: mocks.getDeptTree,
}))

vi.mock('@/hooks/useDownload', () => ({
  useDownload: () => ({
    downloading: { value: false },
    downloadBlob: mocks.downloadBlob,
  }),
}))

vi.mock('@/hooks/usePermission', () => ({
  usePermission: () => ({
    isAdmin: vi.fn(() => false),
    hasPermission: vi.fn(() => false),
  }),
}))

vi.mock('@/stores/user', () => ({
  useUserStore: () => mocks.userStore,
}))

vi.mock('@/utils/confirmAction', () => ({
  confirmAction: mocks.confirmAction,
}))

function createUser(overrides: Partial<UserRecord> = {}): UserRecord {
  return {
    id: 'user-1',
    username: 'alice',
    nickname: 'Alice',
    email: 'alice@example.com',
    phone: '13800000000',
    status: '1',
    created_at: '2026-07-22T00:00:00Z',
    ...overrides,
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, reject, resolve }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.mountedCallbacks.length = 0
  mocks.confirmAction.mockResolvedValue(true)
  mocks.deleteUser.mockResolvedValue(undefined)
  mocks.getDeptTree.mockResolvedValue({ code: 200, message: 'ok', data: [], request_id: 'test' })
  mocks.listRoleNoPage.mockResolvedValue({ code: 200, message: 'ok', data: [], request_id: 'test' })
  mocks.listUser.mockResolvedValue({ code: 200, message: 'ok', data: { items: [], total: 0 }, request_id: 'test' })
  mocks.updateUserStatus.mockResolvedValue(undefined)
})

describe('useUserManagement', () => {
  it('loads users, departments, and roles when mounted', async () => {
    const user = createUser()
    const department: DeptNode = {
      id: 'dept-1',
      name: 'Engineering',
      sort: 1,
      status: '1',
      children: [],
    }
    const role: RoleRecord = {
      id: 'role-1',
      name: 'Developer',
      code: 'developer',
      data_scope: '1',
      is_super: 0,
      sort: 1,
      status: '1',
      created_at: '2026-07-22T00:00:00Z',
    }
    const users = deferred<{ data: { items: UserRecord[], total: number } }>()
    const departments = deferred<{ data: DeptNode[] }>()
    const roles = deferred<{ data: RoleRecord[] }>()
    mocks.listUser.mockReturnValueOnce(users.promise)
    mocks.getDeptTree.mockReturnValueOnce(departments.promise)
    mocks.listRoleNoPage.mockReturnValueOnce(roles.promise)

    const management = useUserManagement()
    expect(mocks.mountedCallbacks).toHaveLength(1)
    mocks.mountedCallbacks[0]?.()

    expect(management.loading.value).toBe(true)
    expect(management.deptTreeLoading.value).toBe(true)
    expect(mocks.listUser).toHaveBeenCalledWith({ page: 1, page_size: 10 })

    users.resolve({ data: { items: [user], total: 1 } })
    departments.resolve({ data: [department] })
    roles.resolve({ data: [role] })

    await vi.waitFor(() => {
      expect(management.loading.value).toBe(false)
      expect(management.deptTreeLoading.value).toBe(false)
    })
    expect(management.tableData.value).toEqual([user])
    expect(management.total.value).toBe(1)
    expect(management.deptTree.value).toEqual([department])
    expect(management.roleList.value).toEqual([role])
  })

  it('always resets user and department loading after request failures', async () => {
    const management = useUserManagement()
    const userError = new Error('users unavailable')
    mocks.listUser.mockRejectedValueOnce(userError)

    const request = management.fetchData()
    expect(management.loading.value).toBe(true)
    await expect(request).rejects.toBe(userError)
    expect(management.loading.value).toBe(false)

    const departmentError = new Error('departments unavailable')
    mocks.getDeptTree.mockRejectedValueOnce(departmentError)
    mocks.mountedCallbacks[0]?.()
    expect(management.deptTreeLoading.value).toBe(true)

    await vi.waitFor(() => expect(management.deptTreeLoading.value).toBe(false))
    expect(management.deptTree.value).toEqual([])
  })

  it('resets filters and keeps department selection synchronized with the query', async () => {
    const management = useUserManagement()
    management.queryParams.value = {
      page: 4,
      page_size: 25,
      username: 'alice',
      status: '1',
      dept_id: 'dept-old',
    }
    management.selectedDeptId.value = 'dept-old'
    management.selectedDeptName.value = 'Legacy'

    management.handleReset()

    expect(management.queryParams.value).toEqual({ page: 1, page_size: 25 })
    expect(management.selectedDeptId.value).toBeUndefined()
    expect(management.selectedDeptName.value).toBe('')
    expect(mocks.listUser).toHaveBeenLastCalledWith({ page: 1, page_size: 25 })

    management.handleDeptSelect({ id: 'dept-1', name: 'Engineering' })
    expect(management.selectedDeptId.value).toBe('dept-1')
    expect(management.selectedDeptName.value).toBe('Engineering')
    expect(management.queryParams.value.dept_id).toBe('dept-1')
    expect(management.queryParams.value.page).toBe(1)

    management.clearDeptFilter()
    expect(management.selectedDeptId.value).toBeUndefined()
    expect(management.selectedDeptName.value).toBe('')
    expect(management.queryParams.value.dept_id).toBeUndefined()
    await vi.waitFor(() => expect(management.loading.value).toBe(false))
  })

  it('restores status when confirmation is cancelled', async () => {
    const management = useUserManagement()
    const user = createUser({ status: '1' })
    mocks.confirmAction.mockResolvedValueOnce(false)

    await management.handleChangeStatus(user, '1')

    expect(user.status).toBe('0')
    expect(mocks.updateUserStatus).not.toHaveBeenCalled()
  })

  it('restores status and preserves the API error when an update fails', async () => {
    const management = useUserManagement()
    const user = createUser({ status: '0' })
    const error = new Error('update failed')
    mocks.updateUserStatus.mockRejectedValueOnce(error)

    await expect(management.handleChangeStatus(user, '0')).rejects.toBe(error)

    expect(user.status).toBe('1')
    expect(mocks.updateUserStatus).toHaveBeenCalledWith('user-1', '0')
    expect(mocks.messageSuccess).not.toHaveBeenCalled()
  })

  it('keeps the delete loading state until deletion and refresh both complete', async () => {
    const management = useUserManagement()
    const user = createUser()
    const deletion = deferred<void>()
    const refresh = deferred<{ data: { items: UserRecord[], total: number } }>()
    const remainingUser = createUser({ id: 'user-2', username: 'bob' })
    mocks.deleteUser.mockReturnValueOnce(deletion.promise)
    mocks.listUser.mockReturnValueOnce(refresh.promise)

    const operation = management.handleDelete(user)
    await vi.waitFor(() => expect(mocks.deleteUser).toHaveBeenCalledWith('user-1'))
    expect(management.deletingId.value).toBe('user-1')

    deletion.resolve()
    await vi.waitFor(() => expect(mocks.listUser).toHaveBeenCalledTimes(1))
    expect(management.deletingId.value).toBe('user-1')
    expect(management.loading.value).toBe(true)

    refresh.resolve({ data: { items: [remainingUser], total: 1 } })
    await operation
    expect(management.deletingId.value).toBeNull()
    expect(management.loading.value).toBe(false)
    expect(management.tableData.value).toEqual([remainingUser])
  })

  it('resets delete loading when the delete request fails', async () => {
    const management = useUserManagement()
    const error = new Error('delete failed')
    mocks.deleteUser.mockRejectedValueOnce(error)

    await expect(management.handleDelete(createUser())).rejects.toBe(error)

    expect(management.deletingId.value).toBeNull()
    expect(mocks.listUser).not.toHaveBeenCalled()
  })
})
