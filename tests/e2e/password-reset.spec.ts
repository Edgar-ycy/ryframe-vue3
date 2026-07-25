import { expect, test } from '@playwright/test'

test('removes reset secrets from the address bar and still submits them', async ({ page }) => {
  const submittedBodies: unknown[] = []

  await page.route('**/api/v1/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())

    if (
      request.method() === 'POST'
      && url.pathname === '/api/v1/auth/password-reset/complete'
    ) {
      submittedBodies.push(request.postDataJSON())
      await route.fulfill({
        status: 200,
        contentType: 'application/json; charset=utf-8',
        body: JSON.stringify({ code: 200, msg: 'ok' }),
      })
      return
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json; charset=utf-8',
      body: JSON.stringify({ code: 200, msg: 'ok', data: null }),
    })
  })

  await page.goto(
    '/reset-password'
    + '#tenant_id=tenant-a&request_id=request-42&token=secret%2Btoken',
  )

  await expect(page).toHaveURL(/\/reset-password$/)
  expect(new URL(page.url()).hash).toBe('')
  expect(new URL(page.url()).search).toBe('')

  const passwordInputs = page.locator('input[type="password"]')
  await passwordInputs.nth(0).fill('Changed@123')
  await passwordInputs.nth(1).fill('Changed@123')
  await page.locator('button.submit-button').click()

  await expect(page).toHaveURL(/\/login$/)
  expect(submittedBodies).toEqual([{
    tenant_id: 'tenant-a',
    request_id: 'request-42',
    token: 'secret+token',
    new_password: 'Changed@123',
  }])
})
