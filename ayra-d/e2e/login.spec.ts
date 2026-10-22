import { test, expect } from '@playwright/test'

test.describe('Login Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should display login form by default', async ({ page }) => {
    const authPanel = page.locator('aside')

    await expect(authPanel.getByRole('heading', { name: 'Log in' })).toBeVisible()
    await expect(authPanel.getByLabel('Email')).toBeVisible()
    await expect(authPanel.getByPlaceholder('Enter your password')).toBeVisible()
    await expect(authPanel.getByRole('button', { name: /^Log in$/ })).toBeVisible()
    await expect(page.getByText('Forgot password?')).toHaveCount(0)
  })

  test('should validate email format', async ({ page }) => {
    const authPanel = page.locator('aside')

    await authPanel.getByLabel('Email').fill('invalid-email')
    await authPanel.getByRole('button', { name: /^Log in$/ }).click()
    
    await expect(authPanel.getByText('Enter a valid email address', { exact: true })).toBeVisible()
  })

  test('should validate required password', async ({ page }) => {
    const authPanel = page.locator('aside')

    await authPanel.getByLabel('Email').fill('client@example.com')
    await authPanel.getByRole('button', { name: /^Log in$/ }).click()
    
    await expect(authPanel.getByText('Password is required', { exact: true })).toBeVisible()
  })

  test('should switch to signup form', async ({ page }) => {
    const authPanel = page.locator('aside')

    await authPanel.getByRole('button', { name: 'Sign up' }).click()
    
    await expect(authPanel.getByRole('heading', { name: 'Sign up' })).toBeVisible()
    await expect(authPanel.getByPlaceholder('Your name')).toBeVisible()
  })

  test('should handle login with wrong credentials', async ({ page }) => {
    const authPanel = page.locator('aside')

    await authPanel.getByLabel('Email').fill('wrong@example.com')
    await authPanel.getByPlaceholder('Enter your password').fill('wrongpassword')
    await authPanel.getByRole('button', { name: /^Log in$/ }).click()
    
    await expect(page.getByText(/Email or password incorrect|Backend unreachable/).first()).toBeVisible()
  })

  test('should be accessible', async ({ page }) => {
    const authPanel = page.locator('aside')
    const emailInput = authPanel.getByLabel('Email')
    const passwordInput = authPanel.getByPlaceholder('Enter your password')
    
    await expect(emailInput).not.toHaveAttribute('aria-invalid', 'true')
    await expect(passwordInput).not.toHaveAttribute('aria-invalid', 'true')
  })

  test('should work on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 640 })
    
    const authPanel = page.locator('aside')

    await expect(page.getByRole('heading', { name: /Walk, play, rest with Pendo/i })).toBeVisible()
    await expect(authPanel.getByLabel('Email')).toBeVisible()
    await expect(authPanel.getByPlaceholder('Enter your password')).toBeVisible()
  })
})
