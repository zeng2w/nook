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

test('syncs only on the visible tracker and automatically loads popular discovery', async ({ page }) => {
  const syncRequests = []
  let calendarRequests = 0
  let trendingRequests = 0
  let newReleaseRequests = 0
  await mockSignedIn(page, { onSyncRequest: request => syncRequests.push(request) })

  await page.route('**/api/shows/calendar', route => { calendarRequests++; return fulfillJson(route, []) })
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
  await expect.poll(() => calendarRequests).toBeGreaterThanOrEqual(2)

  await page.getByRole('button', { name: '智能同步 TMDB 数据' }).click()
  await expect.poll(() => syncRequests.length).toBe(2)
  expect(syncRequests[1].postDataJSON()).toMatchObject({ force: false })
  await expect.poll(() => trendingRequests).toBe(1)
  expect(newReleaseRequests).toBe(0)

  await expect.poll(() => trendingRequests).toBe(1)
  expect(newReleaseRequests).toBe(0)

  await page.getByRole('button', { name: '刚上映' }).click()
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
  staleAnchorDate.setDate(staleAnchorDate.getDate() - 7)
  const staleAnchorKey = [
    staleAnchorDate.getFullYear(),
    String(staleAnchorDate.getMonth() + 1).padStart(2, '0'),
    String(staleAnchorDate.getDate()).padStart(2, '0'),
  ].join('-')
  const rebasedDailyShow = {
    ...firstShow,
    _id: '507f1f77bcf86cd799439025',
    title: 'Rebased Daily Show',
    airedEpisodes: 19,
    totalEpisodes: 30,
    updateFrequency: 'daily',
    updateDays: [],
    updateCount: 2,
    lastAirDate: staleAnchorKey,
    episodeProgressConfirmedAt: `${todayKey}T08:30:00.000Z`,
    episodeUpdateHistory: [{
      date: staleAnchorKey,
      startEpisode: 18,
      endEpisode: 19,
      source: 'tmdb',
    }],
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
  const currentCalendarItem = calendarWidget.locator('.show-item').filter({ hasText: 'Rebased Daily Show' })
  await expect(currentCalendarItem.getByText('当前进度', { exact: true })).toBeVisible()
  await expect(currentCalendarItem.getByText('Ep.19', { exact: true })).toBeVisible()
  const firstCard = page.locator('.show-card').filter({ has: page.getByRole('heading', { name: 'First Show', level: 3 }) })
  const posterBounds = await firstCard.locator('.poster-preview-btn').boundingBox()
  const favoriteBounds = await firstCard.getByRole('button', { name: '喜爱 First Show' }).boundingBox()
  expect(posterBounds.y + posterBounds.height).toBeLessThan(favoriteBounds.y)
  expect(posterBounds.width / posterBounds.height).toBeCloseTo(2 / 3, 2)
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

  await page.locator('body').press('ControlOrMeta+k')
  await expect(page.getByRole('textbox', { name: '搜索剧集名称' })).toBeFocused()
  const listRequestCount = listRequests.length
  const calendarRequestCount = calendarRequests
  const posterButton = page.getByRole('button', { name: '查看 First Show 海报' })
  await posterButton.click()
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
  const rebasedCalendarItems = calendarDialog.locator('.calendar-grid-view .mini-item-card').filter({ hasText: 'Rebased Daily Show' })
  await expect(rebasedCalendarItems.getByText('当前进度 · Ep.19', { exact: true })).toBeVisible()
  await calendarDialog.getByRole('button', { name: '上一周' }).click()
  await expect(rebasedCalendarItems.getByText('已更新 · 18-19', { exact: true })).toBeVisible()
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

test('keeps rapid check-ins available when caught up and supports retry, bulk progress, and stable filters', async ({ page }, testInfo) => {
  await mockSignedIn(page)
  let show = { _id: '507f1f77bcf86cd799439099', title: 'Continuous Show', tmdbId: 555, seasonNumber: 2, category: 'tv', status: 'watching', watchedEpisodes: 5, airedEpisodes: 5, totalEpisodes: 20, updateFrequency: 'weekly', updateDays: [5] }
  await page.route('**/api/tmdb/season/555/2', route => fulfillJson(route, { overview: '第二季的剧情简介。', cast: [{ id: 1, name: '季度主演', character: '主角', profileUrl: '' }] }))
  const targets = []
  let failSave = true
  let heldSearch
  await page.route('**/api/shows/calendar', route => fulfillJson(route, [show]))
  await page.route('**/api/tmdb/trending', route => fulfillJson(route, []))
  await page.route(/\/api\/shows(?:\?.*)?$/, route => {
    const body = { items: [show], pagination: { page: 1, total: 1, hasMore: false }, facets: { allCount: 1, statusCounts: { watching: 1 }, categoryCounts: { tv: 1 }, networkTotal: 1, networks: [] } }
    if (new URL(route.request().url()).searchParams.has('search')) { heldSearch = () => fulfillJson(route, body); return }
    return fulfillJson(route, body)
  })
  await page.route('**/api/shows/*/progress', route => {
    const payload = route.request().postDataJSON()
    targets.push(payload.watchedEpisodes)
    if (failSave) return fulfillJson(route, { error: 'Temporary failure' }, 503)
    show = { ...show, ...payload }
    return fulfillJson(route, { show })
  })
  await page.goto('/home/tv-shows')
  const card = page.locator('.show-card')
  const plus = page.getByRole('button', { name: 'Continuous Show 已看集数加一' })
  await expect(page.locator('.list-status')).toHaveCount(0)
  await expect(card.getByRole('tooltip')).toBeHidden()
  await card.getByRole('button', { name: '修改 Continuous Show 已看集数' }).hover()
  await expect(card.getByRole('tooltip')).toBeVisible()
  await expect(card.locator('.meta-full')).toHaveText('已更新至 5 集 · 共 20 集')
  await expect(plus).toHaveText('又看了一集')
  await expect(card.getByText('已追平', { exact: true })).toBeVisible()
  await expect(plus).toBeEnabled()
  await plus.click({ clickCount: 3 })
  await expect(card.getByRole('button', { name: '修改 Continuous Show 已看集数' })).toContainText('8')
  await expect(card.getByRole('button', { name: '重试', exact: true })).toBeVisible()
  await page.reload()
  await expect(card.getByRole('button', { name: '修改 Continuous Show 已看集数' })).toContainText('8')
  await expect(card.getByRole('button', { name: '重试', exact: true })).toBeVisible()
  failSave = false
  await card.getByRole('button', { name: '重试', exact: true }).click()
  await expect(card.getByText('已记录 ✓')).toBeVisible()
  expect(targets).toEqual([8, 8])

  const progress = card.getByRole('button', { name: '修改 Continuous Show 已看集数' })
  await progress.click()
  const editor = page.getByRole('dialog', { name: '修改 Continuous Show 观看进度' })
  await editor.getByLabel('已看集数', { exact: true }).fill('12')
  await editor.getByRole('button', { name: '保存进度' }).click()
  await expect(progress).toBeFocused()
  await expect.poll(() => targets.at(-1)).toBe(12)
  await expect(card.getByText('已记录 ✓')).toBeVisible()

  const more = card.getByRole('button', { name: 'Continuous Show 更多操作' })
  await more.click()
  await page.getByRole('heading', { name: '追剧记录', exact: true }).click()
  await expect(card.getByRole('button', { name: '编辑', exact: true })).toHaveCount(0)
  await more.click()
  await more.press('Escape')
  await expect(more).toBeFocused()
  const detailsTrigger = card.getByRole('button', { name: '查看 Continuous Show 详情' })
  await detailsTrigger.click()
  await expect(page.getByRole('dialog', { name: 'Continuous Show 详情' })).toContainText('已看 12 集')
  await expect(page.getByRole('dialog', { name: 'Continuous Show 详情' })).toContainText('第二季的剧情简介。')
  await expect(page.getByRole('dialog', { name: 'Continuous Show 详情' })).toContainText('季度主演')
  await page.getByRole('button', { name: '关闭作品详情' }).click()
  await expect(detailsTrigger).toBeFocused()

  await page.getByLabel('搜索剧集名称').fill('Continuous')
  await expect(page.getByText('正在更新列表…')).toBeVisible()
  await expect(page.getByRole('button', { name: '全部类型' })).toBeVisible()
  await expect(card).toBeVisible()
  await expect.poll(() => Boolean(heldSearch)).toBe(true)
  await heldSearch()
  await expect(page.getByText('正在更新列表…')).toHaveCount(0)
  await expect(card.getByRole('progressbar')).toHaveAttribute('aria-valuetext', '已看 12 集，已更新 5 集，共 20 集')
  await page.screenshot({ path: testInfo.outputPath('desktop.png'), fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.getByRole('button', { name: '打开导航菜单' })).toBeVisible()
  await expect(page.locator('.sidebar-backdrop')).toHaveCount(0)
  await plus.click()
  await expect(card.getByText('已记录 ✓')).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('mobile.png'), fullPage: true })
  await page.getByRole('button', { name: '清除筛选', exact: true }).click()
  await expect(page.locator('.list-status')).toHaveCount(0)
  await expect(page.locator('.status-pill.active')).toContainText('在看')
  await progress.click()
  await editor.getByLabel('已看集数', { exact: true }).fill('20')
  await editor.getByRole('button', { name: '保存进度' }).click()
  await expect(card.getByText('已记录 ✓')).toBeVisible()
  const correctionTrigger = page.getByRole('button', { name: '校正 Continuous Show 观看进度' })
  await expect(correctionTrigger).toBeEnabled()
  await correctionTrigger.click()
  await expect(editor).toContainText('已达到记录的总集数')
  await editor.getByLabel('总集数', { exact: true }).fill('25')
  await editor.getByLabel('已看集数', { exact: true }).fill('21')
  await editor.getByRole('button', { name: '保存进度' }).click()
  await expect(card.getByText('已记录 ✓')).toBeVisible()
  expect(show.totalEpisodes).toBe(25)
  expect(show.watchedEpisodes).toBe(21)
  await expect(plus).toBeEnabled()
})

test('opens ranked show details and starts adding it to the watchlist', async ({ page }) => {
  await mockSignedIn(page)
  await page.route('**/api/shows/calendar', route => fulfillJson(route, []))
  await page.route(/\/api\/shows(?:\?.*)?$/, route => fulfillJson(route, { items: [], pagination: { page: 1, total: 0, hasMore: false }, facets: { allCount: 0, statusCounts: {}, categoryCounts: {}, networks: [] } }))
  await page.route('**/api/tmdb/trending', route => fulfillJson(route, [{ id: 987, name: 'Ranked Show', overview: 'A story from the rankings.', first_air_date: '2026-09-01', genre_ids: [18], vote_average: 8.2 }]))
  await page.route('**/api/tmdb/details/tv/987', route => fulfillJson(route, { title: 'Ranked Show', overview: 'A story from the rankings.', cast: [{ id: 2, name: '榜单主演', character: '主角' }], totalEpisodes: 10, airedEpisodes: 5, updateFrequency: 'unknown', networks: [], seasons: [] }))
  await page.goto('/home/tv-shows')
  await page.getByRole('button', { name: '查看 Ranked Show 详情' }).click()
  const details = page.getByRole('dialog', { name: 'Ranked Show 详情' })
  await expect(details).toContainText('A story from the rankings.')
  await expect(details).toContainText('榜单主演')
  await expect(details.getByRole('link', { name: '查看 TMDB 资料' })).toHaveAttribute('href', 'https://www.themoviedb.org/tv/987')
  await details.getByRole('button', { name: '加入想看' }).click()
  await expect(page.getByLabel('作品名称')).toHaveValue('Ranked Show')
  const addDialog = page.getByRole('dialog', { name: '添加新剧集' })
  await expect(addDialog.locator('.stat-input-wrap').filter({ hasText: '已看' }).locator('input')).toHaveValue('0')
  await expect(addDialog.getByRole('button', { name: '关闭剧集编辑窗口' })).toBeFocused()
})


test.describe('touch card layout', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true })

  test('keeps large episode counts readable and actions easy to tap', async ({ page }, testInfo) => {
    await mockSignedIn(page)
    const show = { _id: '507f1f77bcf86cd799439088', title: '四位集数排版示例', category: 'tv', status: 'watching', watchedEpisodes: 1000, airedEpisodes: 1213, totalEpisodes: 1500 }
    await page.route('**/api/shows/calendar', route => fulfillJson(route, []))
    await page.route('**/api/tmdb/trending', route => fulfillJson(route, []))
    await page.route(/\/api\/shows(?:\?.*)?$/, route => fulfillJson(route, { items: [show], pagination: { page: 1, total: 1, hasMore: false }, facets: { allCount: 1, statusCounts: { watching: 1 }, categoryCounts: {}, networks: [] } }))
    await page.goto('/home/tv-shows')
    const card = page.locator('.show-card')
    await expect(card.locator('.meta-compact')).toBeVisible()
    await expect(card.locator('.meta-compact')).toHaveText('已更 1213 · 共 1500 集')
    const dimensions = await card.locator('.progress-meta').evaluate(el => ({ width: el.clientWidth, content: el.scrollWidth }))
    expect(dimensions.content).toBeLessThanOrEqual(dimensions.width)
    const hitArea = await card.locator('.more-action-btn').boundingBox()
    expect(hitArea.width).toBeGreaterThanOrEqual(44)
    expect(hitArea.height).toBeGreaterThanOrEqual(44)
    await page.screenshot({ path: testInfo.outputPath('touch-large-count.png'), fullPage: true })
  })
})

test.describe('release calendar navigation', () => {
  test.use({ timezoneId: 'Asia/Shanghai', viewport: { width: 1440, height: 1000 } })

  test('calendar rolls over at local midnight without another sync request', async ({ page }) => {
    await page.clock.install({ time: new Date('2026-09-27T15:59:50Z') })
    const requests = []
    await mockSignedIn(page, { onSyncRequest: request => requests.push(request) })
    await page.route('**/api/shows/calendar', route => fulfillJson(route, []))
    await page.route('**/api/tmdb/trending', route => fulfillJson(route, []))
    await page.route(/\/api\/shows(?:\?.*)?$/, route => fulfillJson(route, {
      items: [], pagination: { page: 1, total: 0, hasMore: false },
      facets: { allCount: 0, statusCounts: {}, categoryCounts: {}, networks: [] }
    }))
    await page.goto('/home/tv-shows')
    await page.getByRole('button', { name: '打开追剧日历', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: '追剧日历' })
    await expect(dialog.locator('.day-column.is-today .day-circle')).toHaveText('27')
    await page.clock.runFor(3000)
    const count = requests.length
    await page.clock.fastForward(12000)
    await expect(dialog.locator('.day-column.is-today .day-circle')).toHaveText('28')
    await dialog.getByRole('button', { name: '关闭追剧日历' }).click()
    await expect(page.locator('.update-calendar-widget .day-item.active .day-number')).toHaveText('28')
    expect(requests.length).toBe(count)
  })

  test('switches week and month, highlights today and opens calendar entries', async ({ page }, testInfo) => {
    await page.clock.setFixedTime(new Date('2026-09-25T04:00:00Z'))
    await mockSignedIn(page)
    const base = { category: 'tv', status: 'watching', watchedEpisodes: 90, airedEpisodes: 96, totalEpisodes: 120, updateFrequency: 'daily', updateCount: 1, network: '优酷', lastAirDate: '2026-09-24', episodeProgressConfirmedAt: '2026-09-25' }
    const shows = [
      { ...base, _id: '507f1f77bcf86cd799439081', title: '山海之间', playUrl: 'https://example.com/watch/81' },
      { ...base, _id: '507f1f77bcf86cd799439082', title: '未完的旅途', episodeProgressConfirmedAt: '2026-09-24', nextAirDate: '2026-09-25' },
      { ...base, _id: '507f1f77bcf86cd799439083', title: '长风渡' },
    ]
    await page.route('**/api/shows/calendar', route => fulfillJson(route, shows))
    await page.route('**/api/tmdb/trending', route => fulfillJson(route, []))
    await page.route(/\/api\/shows(?:\?.*)?$/, route => fulfillJson(route, { items: shows, pagination: { page: 1, total: 3, hasMore: false }, facets: { allCount: 3, statusCounts: { watching: 3 }, categoryCounts: {}, networks: [] } }))
    await page.goto('/home/tv-shows')
    const trigger = page.getByRole('button', { name: '打开追剧日历', exact: true })
    const widget = page.locator('.update-calendar-widget')
    await widget.getByRole('button', { name: '日 9月27日', exact: true }).click()
    const sidebarEntry = widget.locator('.show-item').filter({ hasText: '山海之间' })
    const sidebarEpisode = await sidebarEntry.locator('.show-episode').innerText()
    const sidebarStatus = await sidebarEntry.locator('.entry-status').innerText()
    await widget.getByRole('button', { name: '打开完整追剧日历' }).click()
    const selectedDay = page.getByRole('dialog', { name: '追剧日历' }).locator('.day-column[data-selected="true"]')
    await expect(selectedDay.locator('.day-circle')).toHaveText('27')
    await expect(selectedDay.getByRole('link', { name: '播放 山海之间（新标签页）' }).locator('.entry-state')).toHaveText(`${sidebarStatus} · ${sidebarEpisode}`)
    await page.getByRole('button', { name: '关闭追剧日历' }).click()
    await trigger.click()
    const dialog = page.getByRole('dialog', { name: '追剧日历' })
    await expect(dialog.locator('.day-column')).toHaveCount(7)
    await expect(dialog.locator('.day-column.is-today')).toContainText('25')
    await expect(dialog.locator('.day-column.is-past')).toHaveCount(5)
    await expect(dialog.locator('.day-column.is-today .entry-state.pending')).toContainText('今日待播')
    await expect(dialog.locator('.is-today').getByRole('link', { name: '播放 山海之间（新标签页）' })).toHaveAttribute('href', 'https://example.com/watch/81')
    const bounds = await dialog.boundingBox()
    expect(bounds.height).toBeLessThan(600)
    await page.screenshot({ path: testInfo.outputPath('calendar-week.png') })
    await dialog.getByRole('button', { name: '下一周' }).click()
    await expect(dialog.locator('.month-label')).toHaveText('2026年 9月 - 10月')
    await dialog.getByRole('button', { name: '今天', exact: true }).click()
    await dialog.getByRole('button', { name: '月', exact: true }).click()
    await expect(dialog.locator('.day-column')).toHaveCount(35)
    const today = dialog.locator('.day-column.is-today')
    await expect(today.locator('.mini-item-card')).toHaveCount(2)
    await today.getByRole('button', { name: '还有 1 部' }).click()
    await expect(today.locator('.mini-item-card')).toHaveCount(3)
    await page.screenshot({ path: testInfo.outputPath('calendar-month.png') })
    await dialog.getByRole('button', { name: '下一月' }).click()
    await expect(dialog.locator('.month-label')).toHaveText('2026年 10月')
    await dialog.getByRole('button', { name: '今天', exact: true }).click()
    await expect(dialog.locator('.month-label')).toHaveText('2026年 9月')
    await page.setViewportSize({ width: 390, height: 844 })
    await expect(dialog.locator('.mobile-agenda-view')).toBeVisible()
    const overflow = await dialog.evaluate(el => el.scrollWidth > el.clientWidth)
    expect(overflow).toBe(false)
    await page.screenshot({ path: testInfo.outputPath('calendar-mobile.png') })
    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
    await expect(trigger).toBeFocused()
    await trigger.click()
    await dialog.locator('.mobile-agenda-view .is-today').getByRole('button', { name: '查看 长风渡 详情' }).click()
    await expect(page.getByRole('dialog', { name: '长风渡 详情' })).toBeVisible()
  })
})
