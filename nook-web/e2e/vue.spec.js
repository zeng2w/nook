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

const mockSignedIn = async (page, { onActivityRequest } = {}) => {
  await page.route('**/api/auth/me', route => fulfillJson(route, { user: TEST_USER }))
  await page.route('**/api/shows/stats', route => fulfillJson(route, {
    showCount: 2,
    statusCounts: { watching: 2, watched: 0, wish: 0, dropped: 0 },
    progressStats: { watched: 4, total: 20, lag: 6, percent: 20 },
  }))
  await page.route(/\/api\/tvlog\/activity(?:\?.*)?$/, route => {
    onActivityRequest?.(new URL(route.request().url()))
    return fulfillJson(route, [])
  })
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
  let activityRequestUrl = null
  await mockSignedIn(page, { onActivityRequest: url => { activityRequestUrl = url } })

  await page.goto('/')

  await expect(page).toHaveURL(/\/home\/dashboard$/)
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
  await expect.poll(() => page.evaluate(() => (
    JSON.parse(sessionStorage.getItem('current_user') || 'null')?.id
  ))).toBe(TEST_USER.id)
  await expect.poll(() => activityRequestUrl?.searchParams.get('timeZone') || '').toMatch(/\S/)
})

test('cleans legacy browser caches once', async ({ page }) => {
  const cleanupKey = 'nook:legacy-cache-cleanup:v1'
  await mockSignedOut(page)
  await page.goto('/login')
  await page.evaluate(async key => {
    localStorage.removeItem(key)
    await caches.open('legacy-cache-before-cleanup')
  }, cleanupKey)

  await page.reload()

  await expect.poll(() => page.evaluate(key => localStorage.getItem(key), cleanupKey)).toBe('done')
  await expect.poll(() => page.evaluate(async () => (
    (await caches.keys()).includes('legacy-cache-before-cleanup')
  ))).toBe(false)

  await page.evaluate(async () => {
    await caches.open('cache-created-after-cleanup')
  })
  await page.reload()

  await expect.poll(() => page.evaluate(async () => (
    (await caches.keys()).includes('cache-created-after-cleanup')
  ))).toBe(true)
})

test('adds and tracks a specific TMDB season', async ({ page }) => {
  await mockSignedIn(page)
  let createdPayload = null

  await page.route('**/api/shows/calendar', route => fulfillJson(route, []))
  await page.route('**/api/tmdb/trending', route => fulfillJson(route, []))
  await page.route('**/api/tmdb/new-releases', route => fulfillJson(route, []))
  await page.route(/\/api\/tmdb\/search(?:\?.*)?$/, route => fulfillJson(route, [{
    tmdbId: 100,
    title: 'Example Show',
    category: 'tv',
    posterUrl: '',
    releaseDate: '2026-01-01',
  }]))
  await page.route('**/api/tmdb/details/tv/100', route => fulfillJson(route, {
    tmdbId: 100,
    title: 'Example Show',
    totalEpisodes: 13,
    airedEpisodes: 12,
    updateFrequency: 'unknown',
    updateDays: [],
    seasons: [
      { seasonNumber: 1, name: 'Season 1', episodeCount: 10 },
      { seasonNumber: 2, name: 'Season 2', episodeCount: 3 },
    ],
    networks: [],
  }))
  await page.route('**/api/tmdb/season/100/2', route => fulfillJson(route, {
    seriesTitle: 'Example Show',
    seasonNumber: 2,
    seasonName: 'Season 2',
    totalEpisodes: 3,
    airedEpisodes: 2,
    lastAirDate: '2026-08-10',
    nextAirDate: '2026-08-30',
    updateFrequency: 'weekly',
    updateDays: [0],
    updateCount: 1,
    isEnded: false,
  }))
  await page.route(/\/api\/shows(?:\?.*)?$/, route => {
    if (route.request().method() === 'POST') {
      createdPayload = route.request().postDataJSON()
      return fulfillJson(route, { ...createdPayload, _id: '507f1f77bcf86cd799439023' })
    }
    return fulfillJson(route, {
      items: [],
      pagination: { page: 1, limit: 24, total: 0, totalPages: 0, hasMore: false },
      facets: {
        allCount: 0,
        statusCounts: { watching: 0, watched: 0, wish: 0, dropped: 0 },
        categoryCounts: { tv: 0, anime: 0, movie: 0, variety: 0 },
        networkTotal: 0,
        networks: [],
      },
    })
  })

  await page.goto('/home/tv-shows')
  await page.getByRole('button', { name: '+ 添加' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('搜索 TMDB 剧名').fill('Example')
  await dialog.getByRole('button', { name: '搜索 TMDB' }).click()
  await dialog.getByText('Example Show', { exact: true }).click()
  await dialog.getByLabel('追踪范围').selectOption({ label: '第 2 季（共 3 集）' })

  await expect(dialog.getByText('已更新至第 2 集 / 共 3 集')).toBeVisible()
  await expect(dialog.getByText('下集：2026-08-30')).toBeVisible()
  await dialog.getByRole('button', { name: '保存' }).click()

  await expect.poll(() => createdPayload?.seasonNumber).toBe(2)
  expect(createdPayload).toMatchObject({
    tmdbId: 100,
    title: 'Example Show · 第 2 季',
    seriesTitle: 'Example Show',
    seasonName: 'Season 2',
    airedEpisodes: 2,
    totalEpisodes: 3,
    nextAirDate: '2026-08-30',
    updateFrequency: 'weekly',
  })
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
  let calendarRequests = 0
  let tvLogRequests = 0
  let createdPayload = null
  let updatedPayload = null
  let updatedShowId = null

  await page.route('**/api/shows/calendar', route => {
    calendarRequests += 1
    return fulfillJson(route, [firstShow, secondShow])
  })
  await page.route('**/api/tvlog', route => {
    tvLogRequests += 1
    return fulfillJson(route, { success: true })
  })
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
    updatedShowId = route.request().url().split('/').pop()
    updatedPayload = route.request().postDataJSON()
    const originalShow = updatedShowId === firstShow._id ? firstShow : secondShow
    return fulfillJson(route, { ...originalShow, ...updatedPayload })
  })

  await page.goto('/home/tv-shows')

  await expect(page.getByRole('heading', { name: 'First Show' })).toBeVisible()
  await expect.poll(() => listRequests.some(url => (
    url.searchParams.get('status') === 'watching' &&
    url.searchParams.get('sort') === 'date' &&
    url.searchParams.get('order') === 'desc'
  ))).toBe(true)

  const listRequestCount = listRequests.length
  const calendarRequestCount = calendarRequests
  await page.getByRole('button', { name: 'First Show 已看集数加一' }).click()
  await expect.poll(() => (
    updatedShowId === firstShow._id ? updatedPayload?.watchedEpisodes : null
  )).toBe(3)
  await expect.poll(() => tvLogRequests).toBe(1)
  expect(listRequests).toHaveLength(listRequestCount)
  expect(calendarRequests).toBe(calendarRequestCount)

  await page.getByRole('button', { name: '打开完整追剧日历' }).click()
  const calendarDialog = page.getByRole('dialog', { name: '追剧日历' })
  await expect(calendarDialog).toBeVisible()
  await expect(calendarDialog.locator('.timezone-label')).not.toBeEmpty()
  await calendarDialog.getByRole('button', { name: '关闭追剧日历' }).click()
  await expect(calendarDialog).toHaveCount(0)

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
