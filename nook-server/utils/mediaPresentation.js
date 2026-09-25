const getMediaPresentation = (data = {}, fallback = {}) => {
  const credits = data.aggregate_credits || data.credits || {};
  const seen = new Set();
  const cast = (credits.cast || [])
    .filter(person => {
      if (!person.name || seen.has(person.id)) return false;
      seen.add(person.id);
      return true;
    })
    .slice(0, 8)
    .map(person => ({
      id: person.id,
      name: person.name,
      character: person.character || (person.roles || []).map(role => role.character).filter(Boolean).join(' / '),
      profileUrl: person.profile_path ? `https://image.tmdb.org/t/p/w185${person.profile_path}` : ''
    }));
  return { overview: data.overview?.trim() || fallback.overview?.trim() || '', cast };
};
module.exports = { getMediaPresentation };
