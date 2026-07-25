import { describe, expect, it, vi } from 'vitest'
import { consumeResetPasswordFragment } from './resetCredentials'

describe('consumeResetPasswordFragment', () => {
  it('captures fragment credentials before immediately removing the URL secret', () => {
    const replaceState = vi.fn()
    const location = {
      search: '',
      hash: '#tenant_id=tenant-a&request_id=request-42&token=secret%2Btoken',
    }
    const history = { state: { navigation: 1 }, replaceState }

    const credentials = consumeResetPasswordFragment(
      location,
      history,
      '/reset-password',
    )

    expect(credentials).toEqual({
      tenantId: 'tenant-a',
      resetRequestKey: 'request-42',
      token: 'secret+token',
    })
    expect(replaceState).toHaveBeenCalledOnce()
    expect(replaceState).toHaveBeenCalledWith(
      history.state,
      '',
      '/reset-password',
    )
  })

  it('discards legacy query credentials while still sanitizing the address bar', () => {
    const replaceState = vi.fn()

    const credentials = consumeResetPasswordFragment(
      {
        search: '?tenant_id=tenant-a&request_id=request-42&token=query-secret',
        hash: '',
      },
      { state: null, replaceState },
      '/reset-password',
    )

    expect(credentials).toEqual({
      tenantId: '',
      resetRequestKey: '',
      token: '',
    })
    expect(replaceState).toHaveBeenCalledWith(null, '', '/reset-password')
  })

  it('does not rewrite an already clean URL', () => {
    const replaceState = vi.fn()

    expect(consumeResetPasswordFragment(
      { search: '', hash: '' },
      { state: null, replaceState },
      '/reset-password',
    )).toEqual({ tenantId: '', resetRequestKey: '', token: '' })
    expect(replaceState).not.toHaveBeenCalled()
  })
})
