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

const mockRuntimeConfig = async (page, registrationEnabled = true) => {
  await page.route('**/api/config', route => fulfillJson(route, { registrationEnabled }))
}

const mockSignedOut = async (page) => {
  await mockRuntimeConfig(page)
  await page.route('**/api/auth/me', route => fulfillJson(route, {
    code: 'AUTHENTICATION_REQUIRED',
    error: 'Authentication required',
  }, 401))
}

const mockSignedIn = async (page, { onActivityRequest, onSyncRequest, syncResponse } = {}) => {
  await mockRuntimeConfig(page)
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
  await page.route('**/api/shows/sync', route => {
    onSyncRequest?.(route.request())
    return fulfillJson(route, {
      success: true,
      checkedCount: 0,
      skippedCount: 0,
      changedCount: 0,
      updatedCount: 0,
      failedCount: 0,
      logs: [],
      seasonDiscoveries: [],
      ...syncResponse,
    })
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
  await mockSignedOut(page)
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
    recommendedSeasonNumber: 2,
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

  await expect(dialog.getByLabel('追踪范围')).toHaveValue('2')
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

test('adds a TMDB movie without requiring a season number', async ({ page }) => {
  await mockSignedIn(page)
  let createdPayload = null

  await page.route('**/api/shows/calendar', route => fulfillJson(route, []))
  await page.route('**/api/tmdb/trending', route => fulfillJson(route, []))
  await page.route('**/api/tmdb/new-releases', route => fulfillJson(route, []))
  await page.route(/\/api\/tmdb\/search(?:\?.*)?$/, route => fulfillJson(route, [{
    tmdbId: 200,
    title: 'Example Movie',
    category: 'movie',
    tmdbType: 'movie',
    posterUrl: '',
    releaseDate: '2026-01-01',
  }]))
  await page.route('**/api/tmdb/details/movie/200', route => fulfillJson(route, {
    tmdbId: 200,
    title: 'Example Movie',
    totalEpisodes: 1,
    airedEpisodes: 1,
    updateFrequency: 'ended',
    updateDays: [],
    nextAirDate: null,
    seasons: [],
    networks: [],
  }))
  await page.route(/\/api\/shows(?:\?.*)?$/, route => {
    if (route.request().method() === 'POST') {
      createdPayload = route.request().postDataJSON()
      return fulfillJson(route, { ...createdPayload, _id: '507f1f77bcf86cd799439024' })
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
  await dialog.getByLabel('搜索 TMDB 剧名').fill('Example Movie')
  await dialog.getByRole('button', { name: '搜索 TMDB' }).click()
  await dialog.getByText('Example Movie', { exact: true }).click()

  await expect(dialog.getByLabel('追踪范围')).toHaveCount(0)
  await dialog.getByRole('button', { name: '保存' }).click()

  await expect.poll(() => createdPayload?.category).toBe('movie')
  expect(createdPayload.seasonNumber).toBeNull()
  expect(createdPayload.updateFrequency).toBe('ended')
})

test('opens a discovered single season without asking for a season choice', async ({ page }) => {
  let createdPayload = null
  await mockSignedIn(page, {
    syncResponse: {
      checkedCount: 1,
      seasonDiscoveries: [{
        type: 'new-season',
        tmdbId: 200,
        seasonNumber: 1,
        seasonName: 'Season 1',
        title: 'Single Season Anime',
        category: 'anime',
        tmdbType: 'anime',
        posterUrl: '',
      }],
    },
  })

  await page.route('**/api/shows/calendar', route => fulfillJson(route, []))
  await page.route('**/api/tmdb/trending', route => fulfillJson(route, []))
  await page.route('**/api/tmdb/new-releases', route => fulfillJson(route, []))
  await page.route('**/api/tmdb/details/anime/200', route => fulfillJson(route, {
    tmdbId: 200,
    title: 'Single Season Anime',
    totalEpisodes: 12,
    airedEpisodes: 12,
    updateFrequency: 'ended',
    updateDays: [],
    recommendedSeasonNumber: 1,
    seasons: [{ seasonNumber: 1, name: 'Season 1', episodeCount: 12 }],
    networks: [],
  }))
  await page.route('**/api/tmdb/season/200/1', route => fulfillJson(route, {
    seriesTitle: 'Single Season Anime',
    seasonNumber: 1,
    seasonName: 'Season 1',
    totalEpisodes: 12,
    airedEpisodes: 12,
    lastAirDate: '2026-09-01',
    nextAirDate: null,
    updateFrequency: 'ended',
    updateDays: [],
    updateCount: 1,
    isEnded: true,
  }))
  await page.route(/\/api\/shows(?:\?.*)?$/, route => {
    if (route.request().method() === 'POST') {
      createdPayload = route.request().postDataJSON()
      return fulfillJson(route, { ...createdPayload, _id: '507f1f77bcf86cd799439025' })
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
  await page.getByRole('button', { name: '消息通知' }).click()
  await expect(page.getByText('发现可追踪的 第 1 季')).toBeVisible()
  await page.getByRole('button', { name: '添加这一季' }).click()

  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText('已自动选择第 1 季')).toBeVisible()
  await expect(dialog.getByLabel('追踪范围')).toHaveCount(0)
  await dialog.getByRole('button', { name: '保存' }).click()

  await expect.poll(() => createdPayload?.seasonNumber).toBe(1)
  expect(createdPayload.title).toBe('Single Season Anime')
})

test('syncs only on the visible tracker and loads discovery on demand', async ({ page }) => {
  const syncRequests = []
  let trendingRequests = 0
  let newReleaseRequests = 0
  await mockSignedIn(page, { onSyncRequest: request => syncRequests.push(request) })

  await page.route('**/api/shows/calendar', route => fulfillJson(route, []))
  await page.route(/\/api\/shows(?:\?.*)?$/, route => fulfillJson(route, {
    items: [],
    pagination: { page: 1, limit: 24, total: 0, totalPages: 0, hasMore: false },
    facets: {
      allCount: 0,
      statusCounts: { watching: 0, watched: 0, wish: 0, dropped: 0 },
      categoryCounts: { tv: 0, anime: 0, movie: 0, variety: 0 },
      networkTotal: 0,
      networks: [],
    },
  }))
  await page.route('**/api/tmdb/trending', route => {
    trendingRequests += 1
    return fulfillJson(route, [])
  })
  await page.route('**/api/tmdb/new-releases', route => {
    newReleaseRequests += 1
    return fulfillJson(route, [])
  })

  await page.goto('/home/dashboard')
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
  expect(syncRequests).toHaveLength(0)

  await page.goto('/home/tv-shows')
  await expect.poll(() => syncRequests.length).toBe(1)
  expect(syncRequests[0].postDataJSON()).toMatchObject({ force: false })
  expect(syncRequests[0].postDataJSON().timeZone).toMatch(/\S/)
  await expect(page.getByText(/已同步/)).toBeVisible()

  await page.getByRole('button', { name: '智能同步 TMDB 数据' }).click()
  await expect.poll(() => syncRequests.length).toBe(2)
  expect(syncRequests[1].postDataJSON()).toMatchObject({ force: false })
  expect(trendingRequests).toBe(0)
  expect(newReleaseRequests).toBe(0)

  await page.getByRole('button', { name: '加载排行榜' }).click()
  await expect.poll(() => trendingRequests).toBe(1)
  expect(newReleaseRequests).toBe(0)

  await page.getByRole('button', { name: '刚上映' }).click()
  await page.getByRole('button', { name: '加载刚上映' }).click()
  await expect.poll(() => newReleaseRequests).toBe(1)
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
  const today = new Date()
  const todayKey = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0'),
  ].join('-')
  const completedOngoingShow = {
    ...firstShow,
    _id: '507f1f77bcf86cd799439024',
    title: 'Caught Up Weekly Show',
    status: 'watched',
    watchedEpisodes: 5,
    airedEpisodes: 5,
    totalEpisodes: 5,
    updateDays: [today.getDay()],
    lastAirDate: todayKey,
  }
  const staleAnchorDate = new Date(today)
  staleAnchorDate.setDate(staleAnchorDate.getDate() - 4)
  const rebasedDailyShow = {
    ...firstShow,
    _id: '507f1f77bcf86cd799439025',
    title: 'Rebased Daily Show',
    airedEpisodes: 19,
    totalEpisodes: 30,
    updateFrequency: 'daily',
    updateDays: [],
    updateCount: 2,
    lastAirDate: [
      staleAnchorDate.getFullYear(),
      String(staleAnchorDate.getMonth() + 1).padStart(2, '0'),
      String(staleAnchorDate.getDate()).padStart(2, '0'),
    ].join('-'),
  }
  const listRequests = []
  let calendarRequests = 0
  let progressRequests = 0
  let createdPayload = null
  let updatedPayload = null
  let updatedShowId = null

  await page.route('**/api/shows/calendar', route => {
    calendarRequests += 1
    return fulfillJson(route, [firstShow, secondShow, completedOngoingShow, rebasedDailyShow])
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
  await page.route(/\/api\/shows\/[a-f\d]{24}\/progress$/, async route => {
    progressRequests += 1
    updatedShowId = route.request().url().split('/').at(-2)
    updatedPayload = route.request().postDataJSON()
    const originalShow = updatedShowId === firstShow._id ? firstShow : secondShow
    return fulfillJson(route, {
      show: { ...originalShow, ...updatedPayload },
      loggedDelta: updatedPayload.watchedEpisodes - originalShow.watchedEpisodes,
    })
  })

  await page.goto('/home/tv-shows')

  await expect(page.getByRole('heading', { name: 'First Show', level: 3 })).toBeVisible()
  const calendarWidget = page.locator('.update-calendar-widget')
  await expect(calendarWidget.getByText('Rebased Daily Show')).toBeVisible()
  await expect(calendarWidget.getByText('18-19', { exact: true })).toBeVisible()
  const firstCard = page.locator('.show-card').filter({ has: page.getByRole('heading', { name: 'First Show', level: 3 }) })
  const posterBounds = await firstCard.locator('.poster-mini').boundingBox()
  const favoriteBounds = await firstCard.getByRole('button', { name: '喜爱 First Show' }).boundingBox()
  expect(posterBounds.x + posterBounds.width).toBeLessThan(favoriteBounds.x)
  await expect(page.getByRole('button', { name: '导入备份' })).toHaveCount(0)
  await page.getByRole('button', { name: '更多操作', exact: true }).click()
  await expect(page.getByRole('button', { name: '导入备份' })).toBeVisible()
  await expect(page.getByRole('button', { name: '导出备份' })).toBeVisible()
  await page.getByRole('button', { name: '更多操作', exact: true }).click()
  await expect.poll(() => listRequests.some(url => (
    url.searchParams.get('status') === 'watching' &&
    url.searchParams.get('sort') === 'date' &&
    url.searchParams.get('order') === 'desc'
  ))).toBe(true)

  await firstCard.getByRole('button', { name: 'First Show 更多操作' }).click()
  await expect(firstCard.getByRole('button', { name: '编辑', exact: true })).toBeVisible()
  await expect(firstCard.getByRole('button', { name: '标记弃剧' })).toBeVisible()
  await firstCard.getByRole('button', { name: 'First Show 更多操作' }).click()

  const listRequestCount = listRequests.length
  const calendarRequestCount = calendarRequests
  const posterButton = page.getByRole('button', { name: '查看 First Show 海报' })
  const posterBox = await posterButton.boundingBox()
  await page.mouse.move(posterBox.x + posterBox.width / 2, posterBox.y + posterBox.height / 2)
  await expect(page.getByRole('button', { name: '关闭海报预览' })).toBeVisible()
  await page.getByRole('button', { name: '关闭海报预览' }).click()
  await page.getByRole('button', { name: 'First Show 已看集数加一' }).click()
  await expect.poll(() => (
    updatedShowId === firstShow._id ? updatedPayload?.watchedEpisodes : null
  )).toBe(3)
  await expect.poll(() => progressRequests).toBe(1)
  expect(listRequests).toHaveLength(listRequestCount)
  expect(calendarRequests).toBe(calendarRequestCount)

  await page.getByRole('button', { name: '打开完整追剧日历' }).click()
  const calendarDialog = page.getByRole('dialog', { name: '追剧日历' })
  await expect(calendarDialog).toBeVisible()
  await expect(calendarDialog.locator('.calendar-grid-view').getByText('Caught Up Weekly Show')).toBeVisible()
  const rebasedCalendarItem = calendarDialog.locator('.mini-item-card').filter({ hasText: 'Rebased Daily Show' })
  await expect(rebasedCalendarItem.getByText('18-19', { exact: true })).toBeVisible()
  await expect(calendarDialog.locator('.timezone-label')).not.toBeEmpty()
  await calendarDialog.getByRole('button', { name: '关闭追剧日历' }).click()
  await expect(calendarDialog).toHaveCount(0)

  await page.getByRole('button', { name: /加载更多/ }).click()
  await expect(page.getByRole('heading', { name: 'Second Show', level: 3 })).toBeVisible()

  await page.getByLabel('搜索剧集名称').fill('Second')
  await expect(page.getByRole('heading', { name: 'First Show', level: 3 })).toHaveCount(0)
  await expect.poll(() => listRequests.some(url => url.searchParams.get('search') === 'Second')).toBe(true)

  await page.getByRole('button', { name: '+ 添加' }).click()
  const addDialog = page.getByRole('dialog')
  await addDialog.getByLabel('作品名称').fill('Added Show')
  await addDialog.getByRole('button', { name: '保存' }).click()
  await expect(page.getByText('添加成功', { exact: true })).toBeVisible()
  await expect.poll(() => createdPayload?.title).toBe('Added Show')

  await page.getByRole('button', { name: 'Second Show 更多操作' }).click()
  await page.getByRole('button', { name: '编辑', exact: true }).click()
  const editDialog = page.getByRole('dialog')
  await editDialog.getByLabel('作品名称').fill('Second Show Edited')
  await editDialog.getByRole('button', { name: '周三', exact: true }).click()
  await editDialog.locator('.stat-input-wrap').filter({ hasText: '总集' }).locator('input').fill('12')
  await editDialog.getByRole('button', { name: '保存' }).click()
  await expect(page.getByText('编辑成功', { exact: true })).toBeVisible()
  await expect.poll(() => updatedPayload?.title).toBe('Second Show Edited')
  expect(updatedPayload).toMatchObject({
    scheduleLocked: true,
    totalEpisodesLocked: true,
    nextAirDate: '',
    totalEpisodes: 12,
  })
})

test('uses drawer navigation and an agenda calendar on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await mockSignedIn(page)

  const today = new Date()
  const todayKey = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0'),
  ].join('-')
  const mobileShow = {
    _id: '507f1f77bcf86cd799439031',
    title: 'Mobile Weekly Show',
    category: 'tv',
    status: 'watching',
    watchedEpisodes: 2,
    airedEpisodes: 5,
    totalEpisodes: 10,
    updateFrequency: 'weekly',
    updateDays: [today.getDay()],
    updateCount: 1,
    lastAirDate: todayKey,
    network: 'Netflix',
  }

  await page.route('**/api/shows/calendar', route => fulfillJson(route, [mobileShow]))
  await page.route('**/api/tmdb/trending', route => fulfillJson(route, []))
  await page.route('**/api/tmdb/new-releases', route => fulfillJson(route, []))
  await page.route(/\/api\/shows(?:\?.*)?$/, route => fulfillJson(route, {
    items: [mobileShow],
    pagination: { page: 1, limit: 24, total: 1, totalPages: 1, hasMore: false },
    facets: {
      allCount: 1,
      statusCounts: { watching: 1, watched: 0, wish: 0, dropped: 0 },
      categoryCounts: { tv: 1, anime: 0, movie: 0, variety: 0 },
      networkTotal: 1,
      networks: [{ name: 'Netflix', logo: '', count: 1 }],
    },
  }))

  await page.goto('/home/tv-shows')

  const sidebar = page.locator('.sidebar')
  await expect(page.getByRole('button', { name: '打开导航菜单' })).toBeVisible()
  expect(await page.evaluate(() => [
    '.main-content-column',
    '.sticky-filter-bar',
    '.filter-bar-wrapper',
    '.status-group',
    '.toolbar-actions',
  ]
    .map(selector => document.querySelector(selector))
    .filter(element => element && element.scrollWidth > element.clientWidth + 1)
    .map(element => ({
      className: element.className,
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
    })))).toEqual([])
  await expect(sidebar).not.toHaveClass(/mobile-sidebar-open/)
  const contentBox = await page.locator('.content-area').boundingBox()
  expect(contentBox.width).toBeGreaterThanOrEqual(389)

  await page.getByRole('button', { name: '打开导航菜单' }).click()
  await expect(sidebar).toHaveClass(/mobile-sidebar-open/)
  await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible()
  await page.getByRole('button', { name: '收起侧边栏' }).click()
  await expect(sidebar).not.toHaveClass(/mobile-sidebar-open/)

  await page.getByRole('button', { name: '查看 Mobile Weekly Show 海报' }).click()
  await expect(page.getByRole('button', { name: '关闭海报预览' })).toBeVisible()
  await page.getByRole('button', { name: '关闭海报预览' }).click()
  await expect(page.getByRole('button', { name: '关闭海报预览' })).toBeHidden()

  await page.getByRole('button', { name: '打开追剧日历' }).click()
  const calendarDialog = page.getByRole('dialog', { name: '追剧日历' })
  await expect(calendarDialog.locator('.calendar-grid-view')).toBeHidden()
  await expect(calendarDialog.locator('.mobile-agenda-view')).toBeVisible()
  await expect(calendarDialog.locator('.mobile-agenda-view').getByText('Mobile Weekly Show')).toBeVisible()
})
