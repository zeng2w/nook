const toNonNegativeInteger = value => {
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 ? number : 0;
};

const deriveShowStatus = (show = {}) => {
  if (show.status === 'dropped') return 'dropped';

  const watchedEpisodes = toNonNegativeInteger(show.watchedEpisodes);
  const totalEpisodes = toNonNegativeInteger(show.totalEpisodes);
  const airedEpisodes = toNonNegativeInteger(show.airedEpisodes);

  if (watchedEpisodes === 0) return show.trackingStarted ? 'watching' : 'wish';
  if (
    totalEpisodes > 0 &&
    airedEpisodes >= totalEpisodes &&
    watchedEpisodes >= totalEpisodes
  ) return 'watched';
  return 'watching';
};

const getSyncedEpisodeCount = (show = {}, remoteEpisodeCount) => {
  const remoteCount = toNonNegativeInteger(remoteEpisodeCount);
  const totalEpisodes = toNonNegativeInteger(show.totalEpisodes);
  return show.totalEpisodesLocked && totalEpisodes > 0
    ? Math.min(remoteCount, totalEpisodes)
    : remoteCount;
};

const applyDerivedShowStatus = (show) => {
  const nextStatus = deriveShowStatus(show);
  if (show.status === nextStatus) return false;
  if (nextStatus === 'watched') show.completedAt = new Date();
  show.status = nextStatus;
  return true;
};

module.exports = { applyDerivedShowStatus, deriveShowStatus, getSyncedEpisodeCount };
