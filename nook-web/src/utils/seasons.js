const toSeasonNumber = value => {
  const number = Number(value)
  return Number.isInteger(number) && number > 0 ? number : null
}

export const getDefaultSeasonNumber = (details = {}) => {
  const seasons = Array.isArray(details.seasons) ? details.seasons : []
  const seasonNumbers = seasons
    .map(season => toSeasonNumber(season.seasonNumber))
    .filter(Boolean)
  if (seasonNumbers.length === 0) return null

  const recommended = toSeasonNumber(details.recommendedSeasonNumber)
  if (recommended && seasonNumbers.includes(recommended)) return recommended
  if (seasonNumbers.length === 1) return seasonNumbers[0]
  return Math.max(...seasonNumbers)
}
