const getAiredEpisodeCount = (data) => {
  const lastEpisode = data?.last_episode_to_air;
  if (!lastEpisode) return Number(data?.number_of_episodes) || 0;

  const previousSeasonEpisodes = (data.seasons || [])
    .filter(season => (
      season.season_number > 0 &&
      season.season_number < lastEpisode.season_number
    ))
    .reduce((total, season) => total + (Number(season.episode_count) || 0), 0);

  return previousSeasonEpisodes + (Number(lastEpisode.episode_number) || 0);
};

const getValidAirDate = (value) => {
  if (typeof value !== 'string') return null;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, monthIndex, day, 12));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== monthIndex ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return value;
};

const getTmdbSchedule = (data = {}) => {
  if (data.status === 'Ended' || data.status === 'Canceled') {
    return { updateFrequency: 'ended', updateDays: [], nextAirDate: null };
  }

  const nextAirDate = getValidAirDate(data.next_episode_to_air?.air_date);
  if (!nextAirDate) {
    return { updateFrequency: 'unknown', updateDays: [], nextAirDate: null };
  }

  const [year, month, day] = nextAirDate.split('-').map(Number);
  const updateDay = new Date(Date.UTC(year, month - 1, day, 12)).getUTCDay();
  return { updateFrequency: 'weekly', updateDays: [updateDay], nextAirDate };
};

const getTmdbSeasonProgress = (seasonData = {}, seriesData = {}, options = {}) => {
  const seasonNumber = Number(seasonData.season_number ?? options.seasonNumber);
  const today = getValidAirDate(options.today) || new Date().toISOString().slice(0, 10);
  const episodes = Array.isArray(seasonData.episodes) ? seasonData.episodes : [];
  const normalizedEpisodes = episodes
    .map(episode => ({
      episodeNumber: Number(episode.episode_number) || 0,
      airDate: getValidAirDate(episode.air_date),
      episodeType: episode.episode_type || ''
    }))
    .filter(episode => episode.episodeNumber > 0);
  const aired = normalizedEpisodes
    .filter(episode => episode.airDate && episode.airDate <= today)
    .sort((left, right) => (
      left.airDate.localeCompare(right.airDate) || left.episodeNumber - right.episodeNumber
    ));
  const future = normalizedEpisodes
    .filter(episode => episode.airDate && episode.airDate > today)
    .sort((left, right) => (
      left.airDate.localeCompare(right.airDate) || left.episodeNumber - right.episodeNumber
    ));
  const latestAiredEpisode = aired.at(-1);
  const airedEpisodes = aired.reduce(
    (maximum, episode) => Math.max(maximum, episode.episodeNumber),
    0
  );
  const totalEpisodes = Math.max(
    Number(seasonData.episode_count) || 0,
    normalizedEpisodes.length,
    ...normalizedEpisodes.map(episode => episode.episodeNumber)
  );

  const seriesNextEpisode = seriesData.next_episode_to_air;
  const seriesNextAirDate = Number(seriesNextEpisode?.season_number) === seasonNumber
    ? getValidAirDate(seriesNextEpisode.air_date)
    : null;
  const latestStartedSeason = (seriesData.seasons || []).reduce((maximum, season) => {
    const airDate = getValidAirDate(season.air_date);
    return airDate && airDate <= today
      ? Math.max(maximum, Number(season.season_number) || 0)
      : maximum;
  }, 0);
  const hasLaterSeason = (
    latestStartedSeason > seasonNumber ||
    Number(seriesData.last_episode_to_air?.season_number) > seasonNumber ||
    Number(seriesData.next_episode_to_air?.season_number) > seasonNumber
  );
  const seriesEnded = seriesData.status === 'Ended' || seriesData.status === 'Canceled';
  const seriesLastEpisode = seriesData.last_episode_to_air;
  const seriesLastAirDate = getValidAirDate(seriesLastEpisode?.air_date);
  const seasonFinaleAired = (
    latestAiredEpisode?.episodeType === 'finale' || (
      Number(seriesLastEpisode?.season_number) === seasonNumber &&
      seriesLastEpisode?.episode_type === 'finale' &&
      seriesLastAirDate &&
      seriesLastAirDate <= today
    )
  );
  const candidateNextAirDate = seriesNextAirDate || future[0]?.airDate || null;
  const isEnded = seriesEnded || seasonFinaleAired || (hasLaterSeason && !candidateNextAirDate);
  const nextAirDate = isEnded ? null : candidateNextAirDate;
  const updateCount = nextAirDate
    ? Math.max(1, future.filter(episode => episode.airDate === nextAirDate).length)
    : 1;
  const updateDay = nextAirDate
    ? new Date(`${nextAirDate}T12:00:00.000Z`).getUTCDay()
    : null;

  return {
    seriesTitle: seriesData.name || seriesData.title || '',
    seasonNumber,
    seasonName: seasonData.name || `第 ${seasonNumber} 季`,
    totalEpisodes,
    airedEpisodes,
    lastAirDate: latestAiredEpisode?.airDate || null,
    nextAirDate,
    updateFrequency: isEnded ? 'ended' : nextAirDate ? 'weekly' : 'unknown',
    updateDays: updateDay === null ? [] : [updateDay],
    updateCount,
    isEnded
  };
};

module.exports = { getAiredEpisodeCount, getTmdbSchedule, getTmdbSeasonProgress };
