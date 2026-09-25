const test = require('node:test');
const assert = require('node:assert/strict');
const { getMediaPresentation } = require('../utils/mediaPresentation');

test('supports series aggregate roles and movie credits without duplicate people', () => {
  const series = getMediaPresentation({ overview: '  Story  ', aggregate_credits: { cast: [
    { id: 1, name: 'Actor', profile_path: '/actor.jpg', roles: [{ character: 'Lead' }, { character: 'Narrator' }] },
    { id: 1, name: 'Actor' }, { id: 2, name: '' }
  ] } });
  assert.equal(series.overview, 'Story');
  assert.deepEqual(series.cast, [{ id: 1, name: 'Actor', profileUrl: 'https://image.tmdb.org/t/p/w185/actor.jpg', character: 'Lead / Narrator' }]);
  assert.deepEqual(getMediaPresentation({ credits: { cast: [{ id: 2, name: 'Movie actor', character: 'Hero' }] } }).cast[0], { id: 2, name: 'Movie actor', character: 'Hero', profileUrl: '' });
});

test('falls back to series synopsis without borrowing cast from a different season', () => {
  assert.deepEqual(getMediaPresentation({}, { overview: 'Series synopsis', credits: { cast: [{ id: 1, name: 'Other season actor' }] } }), { overview: 'Series synopsis', cast: [] });
});
