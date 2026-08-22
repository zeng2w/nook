import { test, expect } from '@playwright/test'

// See here how to get started:
// https://playwright.dev/docs/intro
test('redirects the app root to login', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Log In' })).toBeVisible()
})

test('protects authenticated routes', async ({ page }) => {
  await page.goto('/home/dashboard')
  await expect(page).toHaveURL(/\/login$/)
})

test('opens the registration page', async ({ page }) => {
  await page.goto('/login')
  await page.getByText('Sign up', { exact: true }).click()
  await expect(page).toHaveURL(/\/register$/)
  await expect(page.getByRole('heading', { name: 'Create Account' })).toBeVisible()
})
