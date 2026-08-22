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

module.exports = { getAiredEpisodeCount };
