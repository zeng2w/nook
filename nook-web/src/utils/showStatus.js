const toNonNegativeInteger = (value) => {
  const number = Number(value)
  return Number.isInteger(number) && number >= 0 ? number : 0
}

export const deriveShowStatus = (show = {}) => {
  if (show.status === 'dropped') return 'dropped'

  const watchedEpisodes = toNonNegativeInteger(show.watchedEpisodes)
  const airedEpisodes = toNonNegativeInteger(show.airedEpisodes)
  const totalEpisodes = toNonNegativeInteger(show.totalEpisodes)

  if (watchedEpisodes === 0) return show.trackingStarted ? 'watching' : 'wish'
  if (
    totalEpisodes > 0 &&
    airedEpisodes >= totalEpisodes &&
    watchedEpisodes >= totalEpisodes
  ) return 'watched'
  return 'watching'
}
