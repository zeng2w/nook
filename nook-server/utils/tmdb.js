const TMDB_ANIMATION_GENRE_ID = 16;
const TMDB_VARIETY_GENRE_IDS = new Set([10763, 10764, 10767]);

const classifyTmdbCategory = (item = {}) => {
  if (item.media_type === 'movie') return 'movie';

  const genreIds = Array.isArray(item.genre_ids)
    ? item.genre_ids.map(Number).filter(Number.isInteger)
    : [];
  if (genreIds.includes(TMDB_ANIMATION_GENRE_ID)) return 'anime';
  if (genreIds.some(genreId => TMDB_VARIETY_GENRE_IDS.has(genreId))) return 'variety';
  return 'tv';
};

const getTmdbMediaType = type => (
  ['anime', 'variety'].includes(type) ? 'tv' : type
);

const getAiredEpisodeCount = (data) => {
  const lastEpisode = data?.last_episode_to_air;
  // 缺失确认数据不等于确认更新到 0 集，不能用于覆盖已有进度。
  if (!Number.isInteger(Number(lastEpisode?.season_number)) ||
      Number(lastEpisode?.season_number) < 1 ||
      !Number.isInteger(Number(lastEpisode?.episode_number)) ||
      Number(lastEpisode?.episode_number) < 1) return null;

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
  const nextAirDate = getValidAirDate(data.next_episode_to_air?.air_date);
  if (nextAirDate) {
    const [year, month, day] = nextAirDate.split('-').map(Number);
    const updateDay = new Date(Date.UTC(year, month - 1, day, 12)).getUTCDay();
    return { updateFrequency: 'weekly', updateDays: [updateDay], nextAirDate };
  }

  if (data.status === 'Ended' || data.status === 'Canceled') {
    return { updateFrequency: 'ended', updateDays: [], nextAirDate: null };
  }

  return { updateFrequency: 'unknown', updateDays: [], nextAirDate: null };
};

const getRecommendedSeasonNumber = (data = {}, options = {}) => {
  const today = getValidAirDate(options.today) || new Date().toISOString().slice(0, 10);
  const validSeasons = (data.seasons || [])
    .map(season => ({
      seasonNumber: Number(season.season_number) || 0,
      airDate: getValidAirDate(season.air_date)
    }))
    .filter(season => season.seasonNumber > 0);
  if (validSeasons.length === 0) return null;

  const knownSeasonNumbers = new Set(validSeasons.map(season => season.seasonNumber));
  const nextSeason = Number(data.next_episode_to_air?.season_number) || 0;
  if (knownSeasonNumbers.has(nextSeason)) return nextSeason;

  const lastSeason = Number(data.last_episode_to_air?.season_number) || 0;
  if (knownSeasonNumbers.has(lastSeason)) return lastSeason;

  const startedSeasons = validSeasons.filter(season => season.airDate && season.airDate <= today);
  if (startedSeasons.length > 0) {
    return Math.max(...startedSeasons.map(season => season.seasonNumber));
  }

  return Math.min(...validSeasons.map(season => season.seasonNumber));
};

const hasTmdbSeasonActivity = (data = {}, seasonNumber, airedEpisodes = 0) => {
  const normalizedSeasonNumber = Number(seasonNumber) || 0;
  if (normalizedSeasonNumber < 1) return false;

  const nextEpisode = data.next_episode_to_air;
  if (Number(nextEpisode?.season_number) === normalizedSeasonNumber) return true;

  const lastEpisode = data.last_episode_to_air;
  return (
    Number(lastEpisode?.season_number) === normalizedSeasonNumber &&
    Number(lastEpisode?.episode_number) > (Number(airedEpisodes) || 0)
  );
};

const getTmdbSeasonProgress = (seasonData = {}, seriesData = {}, options = {}) => {
  const seasonNumber = Number(seasonData.season_number ?? options.seasonNumber);
  const today = getValidAirDate(options.today) || new Date().toISOString().slice(0, 10);
  const episodes = Array.isArray(seasonData.episodes) ? seasonData.episodes : [];
  const lastConfirmed = seriesData.last_episode_to_air;
  const confirmedSeason = Number(lastConfirmed?.season_number) || 0;
  const confirmedLimit = confirmedSeason === seasonNumber
    ? Math.max(0, Number(lastConfirmed.episode_number) || 0)
    : confirmedSeason > seasonNumber ? Infinity : 0;
  const normalizedEpisodes = episodes
    .map(episode => ({
      episodeNumber: Number(episode.episode_number) || 0,
      airDate: getValidAirDate(episode.air_date),
      episodeType: episode.episode_type || ''
    }))
    .filter(episode => episode.episodeNumber > 0);
  const aired = normalizedEpisodes
    .filter(episode => episode.airDate && episode.airDate <= today && episode.episodeNumber <= confirmedLimit)
    .sort((left, right) => (
      left.airDate.localeCompare(right.airDate) || left.episodeNumber - right.episodeNumber
    ));
  // 日期已到但还未进入 last_episode_to_air 的集数仍然属于待播。
  const pendingEpisodes = normalizedEpisodes
    .filter(episode => episode.airDate && episode.episodeNumber > confirmedLimit)
    .sort((left, right) => (
      left.airDate.localeCompare(right.airDate) || left.episodeNumber - right.episodeNumber
    ));
  const latestAiredEpisode = aired.at(-1);
  const datedAiredEpisodes = aired.reduce(
    (maximum, episode) => Math.max(maximum, episode.episodeNumber),
    0
  );
  const airedEpisodes = getAiredEpisodeCount(seriesData) === null
    ? null
    : confirmedSeason === seasonNumber ? confirmedLimit : datedAiredEpisodes;
  const totalEpisodes = Math.max(
    Number(seasonData.episode_count) || 0,
    normalizedEpisodes.length,
    ...normalizedEpisodes.map(episode => episode.episodeNumber)
  );

  const seriesNextEpisode = seriesData.next_episode_to_air;
  const seriesNextAirDate = Number(seriesNextEpisode?.season_number) === seasonNumber &&
    Number(seriesNextEpisode?.episode_number) > (airedEpisodes ?? 0)
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
  const candidateNextAirDate = seriesNextAirDate || pendingEpisodes[0]?.airDate || null;
  const isEnded = (
    (seasonFinaleAired && !candidateNextAirDate) ||
    (seriesEnded && !candidateNextAirDate) ||
    (hasLaterSeason && !candidateNextAirDate)
  );
  const nextAirDate = isEnded ? null : candidateNextAirDate;
  const updateCount = nextAirDate
    ? Math.max(1, pendingEpisodes.filter(episode => episode.airDate === nextAirDate).length)
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
    lastAirDate: confirmedSeason === seasonNumber
      ? getValidAirDate(lastConfirmed.air_date) || latestAiredEpisode?.airDate || null
      : latestAiredEpisode?.airDate || null,
    nextAirDate,
    updateFrequency: isEnded ? 'ended' : nextAirDate ? 'weekly' : 'unknown',
    updateDays: updateDay === null ? [] : [updateDay],
    updateCount,
    isEnded
  };
};

module.exports = {
  classifyTmdbCategory,
  getAiredEpisodeCount,
  getTmdbMediaType,
  getRecommendedSeasonNumber,
  getTmdbSchedule,
  getTmdbSeasonProgress,
  hasTmdbSeasonActivity
};
