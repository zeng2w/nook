const DEFAULT_LIMIT = 24;
const MAX_LIMIT = 100;

const parsePositiveInteger = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const getPagination = (query = {}, defaultLimit = DEFAULT_LIMIT) => {
  const page = parsePositiveInteger(query.page, 1);
  const limit = Math.min(parsePositiveInteger(query.limit, defaultLimit), MAX_LIMIT);

  return { page, limit, skip: (page - 1) * limit };
};

const wantsPagination = (query = {}) => (
  Object.prototype.hasOwnProperty.call(query, 'page') ||
  Object.prototype.hasOwnProperty.call(query, 'limit')
);

const findPage = async (Model, filter, options = {}) => {
  const { page, limit, skip } = getPagination(options.query, options.defaultLimit);
  const [items, total] = await Promise.all([
    Model.find(filter)
      .select(options.select || '')
      .sort(options.sort || {})
      .skip(skip)
      .limit(limit)
      .lean(),
    Model.countDocuments(filter)
  ]);
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasMore: page < totalPages
    }
  };
};

module.exports = {
  findPage,
  getPagination,
  wantsPagination
};
