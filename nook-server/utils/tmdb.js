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

module.exports = { getAiredEpisodeCount, getTmdbSchedule };
