// src/api/tmdb.js
import axios from 'axios';

export const fetchTrendingShows = () => {
  return axios.get('/api/tmdb/trending');
};

export const fetchNewReleases = () => {
  return axios.get('/api/tmdb/new-releases');
};
const presentationCache = new Map();
export const fetchShowPresentation = async show => {
  const type = show.category === 'movie' ? 'movie' : 'tv';
  const path = type === 'tv' && Number.isInteger(show.seasonNumber) && show.seasonNumber > 0
    ? `/api/tmdb/season/${show.tmdbId}/${show.seasonNumber}`
    : `/api/tmdb/details/${type}/${show.tmdbId}`;
  const cached = presentationCache.get(path);
  if (cached && cached.expires > Date.now()) return cached.promise;
  const promise = axios.get(path).then(response => response.data).catch(error => {
    presentationCache.delete(path);
    throw error;
  });
  presentationCache.set(path, { promise, expires: Date.now() + 5 * 60 * 1000 });
  if (presentationCache.size > 50) presentationCache.delete(presentationCache.keys().next().value);
  return promise;
};
