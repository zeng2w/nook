import { test, expect } from '@playwright/test'

const TEST_USER = {
  id: '507f1f77bcf86cd799439011',
  username: 'Local User',
  email: 'local@example.com',
}

const fulfillJson = (route, body, status = 200) => route.fulfill({
  status,
  contentType: 'application/json',
  body: JSON.stringify(body),
})

const mockSignedOut = async (page) => {
  await page.route('**/api/auth/me', route => fulfillJson(route, {
    code: 'AUTHENTICATION_REQUIRED',
    error: 'Authentication required',
  }, 401))
}

const mockSignedIn = async (page) => {
  await page.route('**/api/auth/me', route => fulfillJson(route, { user: TEST_USER }))
  await page.route('**/api/shows/stats', route => fulfillJson(route, {
    showCount: 2,
    statusCounts: { watching: 2, watched: 0, wish: 0, dropped: 0 },
    progressStats: { watched: 4, total: 20, lag: 6, percent: 20 },
  }))
  await page.route('**/api/tvlog/activity', route => fulfillJson(route, []))
}

test('redirects the app root to login', async ({ page }) => {
  await mockSignedOut(page)
  await page.goto('/')
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Log In' })).toBeVisible()
})

test('protects authenticated routes', async ({ page }) => {
  await mockSignedOut(page)
  await page.goto('/home/dashboard')
  await expect(page).toHaveURL(/\/login$/)
})

test('opens the registration page', async ({ page }) => {
  await page.goto('/login')
  await page.getByText('Sign up', { exact: true }).click()
  await expect(page).toHaveURL(/\/register$/)
  await expect(page.getByRole('heading', { name: 'Create Account' })).toBeVisible()
})

test('restores a Cookie session even when sessionStorage is empty', async ({ page }) => {
  await mockSignedIn(page)

  await page.goto('/')

  await expect(page).toHaveURL(/\/home\/dashboard$/)
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
  await expect.poll(() => page.evaluate(() => (
    JSON.parse(sessionStorage.getItem('current_user') || 'null')?.id
  ))).toBe(TEST_USER.id)
})

test('loads, filters, adds, and edits shows through the paginated API', async ({ page }) => {
  await mockSignedIn(page)

  const firstShow = {
    _id: '507f1f77bcf86cd799439021',
    title: 'First Show',
    category: 'tv',
    status: 'watching',
    watchedEpisodes: 2,
    airedEpisodes: 5,
    totalEpisodes: 10,
    updateFrequency: 'weekly',
    updateDays: [1],
    updateCount: 1,
    network: 'Netflix',
    isFavorite: false,
  }
  const secondShow = {
    ...firstShow,
    _id: '507f1f77bcf86cd799439022',
    title: 'Second Show',
    watchedEpisodes: 4,
  }
  const listRequests = []
  let createdPayload = null
  let updatedPayload = null

  await page.route('**/api/shows/calendar', route => fulfillJson(route, [firstShow, secondShow]))
  await page.route('**/api/tmdb/trending', route => fulfillJson(route, []))
  await page.route('**/api/tmdb/new-releases', route => fulfillJson(route, []))
  await page.route(/\/api\/shows(?:\?.*)?$/, async route => {
    const request = route.request()
    if (request.method() === 'POST') {
      createdPayload = request.postDataJSON()
      return fulfillJson(route, { ...createdPayload, _id: '507f1f77bcf86cd799439023' })
    }

    const url = new URL(request.url())
    listRequests.push(url)
    const search = url.searchParams.get('search') || ''
    const pageNumber = Number(url.searchParams.get('page') || 1)
    const items = search
      ? [secondShow]
      : pageNumber === 1 ? [firstShow] : [secondShow]

    return fulfillJson(route, {
      items,
      pagination: {
        page: pageNumber,
        limit: 24,
        total: search ? 1 : 2,
        totalPages: search ? 1 : 2,
        hasMore: !search && pageNumber === 1,
      },
      facets: {
        allCount: 2,
        statusCounts: { watching: 2, watched: 0, wish: 0, dropped: 0 },
        categoryCounts: { tv: 2, anime: 0, movie: 0, variety: 0 },
        networkTotal: 2,
        networks: [{ name: 'Netflix', logo: '', count: 2 }],
      },
    })
  })
  await page.route(/\/api\/shows\/[a-f\d]{24}$/, async route => {
    updatedPayload = route.request().postDataJSON()
    return fulfillJson(route, { ...secondShow, ...updatedPayload })
  })

  await page.goto('/home/tv-shows')

  await expect(page.getByRole('heading', { name: 'First Show' })).toBeVisible()
  await expect.poll(() => listRequests.some(url => (
    url.searchParams.get('status') === 'watching' &&
    url.searchParams.get('sort') === 'date' &&
    url.searchParams.get('order') === 'desc'
  ))).toBe(true)

  await page.getByRole('button', { name: /加载更多/ }).click()
  await expect(page.getByRole('heading', { name: 'Second Show' })).toBeVisible()

  await page.getByLabel('搜索剧集名称').fill('Second')
  await expect(page.getByRole('heading', { name: 'First Show' })).toHaveCount(0)
  await expect.poll(() => listRequests.some(url => url.searchParams.get('search') === 'Second')).toBe(true)

  await page.getByRole('button', { name: '+ 添加' }).click()
  const addDialog = page.getByRole('dialog')
  await addDialog.getByLabel('作品名称').fill('Added Show')
  await addDialog.getByRole('button', { name: '保存' }).click()
  await expect(page.getByText('添加成功', { exact: true })).toBeVisible()
  await expect.poll(() => createdPayload?.title).toBe('Added Show')

  await page.getByRole('button', { name: '编辑 Second Show' }).click()
  const editDialog = page.getByRole('dialog')
  await editDialog.getByLabel('作品名称').fill('Second Show Edited')
  await editDialog.getByRole('button', { name: '保存' }).click()
  await expect(page.getByText('编辑成功', { exact: true })).toBeVisible()
  await expect.poll(() => updatedPayload?.title).toBe('Second Show Edited')
})
