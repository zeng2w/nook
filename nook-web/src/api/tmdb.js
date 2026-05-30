// src/api/tmdb.js
import axios from 'axios';

export const fetchTrendingShows = () => {
  return axios.get('/api/tmdb/trending');
};

export const fetchNewReleases = () => {
  return axios.get('/api/tmdb/new-releases');
};