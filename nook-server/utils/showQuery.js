const { getPagination } = require('./pagination');

const SHOW_STATUSES = ['wish', 'watching', 'watched', 'dropped'];
const SHOW_CATEGORIES = ['tv', 'anime', 'movie', 'variety'];
const SHOW_SORTS = ['date', 'lag', 'title'];

class QueryValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'QueryValidationError';
    this.status = 400;
    this.code = 'INVALID_QUERY';
  }
}

const getScalar = (value, name) => {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') throw new QueryValidationError(`${name} must be a string`);
  return value.trim();
};

const getEnum = (value, allowed, name) => {
  const normalized = getScalar(value, name);
  if (!normalized || normalized === 'all') return undefined;
  if (!allowed.includes(normalized)) {
    throw new QueryValidationError(`${name} is not supported`);
  }
  return normalized;
};

const escapeRegExp = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const parseShowQuery = (query = {}) => {
  const search = getScalar(query.search, 'search') || '';
  const network = getScalar(query.network, 'network');
  const sort = getEnum(query.sort, SHOW_SORTS, 'sort') || 'date';
  const order = getEnum(query.order, ['asc', 'desc'], 'order') || 'desc';

  if (search.length > 100) throw new QueryValidationError('search must not exceed 100 characters');
  if (network && network !== 'all' && network.length > 100) {
    throw new QueryValidationError('network must not exceed 100 characters');
  }

  return {
    ...getPagination(query),
    search,
    status: getEnum(query.status, SHOW_STATUSES, 'status'),
    category: getEnum(query.category, SHOW_CATEGORIES, 'category'),
    network: !network || network === 'all' ? undefined : network,
    sort,
    order
  };
};

const buildFilter = (options, omitted = []) => {
  const filter = {};
  if (options.status && !omitted.includes('status')) filter.status = options.status;
  if (options.category && !omitted.includes('category')) filter.category = options.category;
  if (options.network && !omitted.includes('network')) filter.network = options.network;
  return filter;
};

const buildShowListPipeline = (userId, options) => {
  const baseFilter = { userId };
  if (options.search) {
    baseFilter.title = { $regex: new RegExp(escapeRegExp(options.search), 'i') };
  }

  const fullFilter = buildFilter(options);
  const sortDirection = options.order === 'asc' ? 1 : -1;
  const sortStage = { isFavorite: -1 };
  if (!options.status) sortStage.statusRank = 1;
  sortStage[options.sort === 'date' ? 'lastAirDate' : options.sort === 'lag' ? 'sortLag' : 'title'] = sortDirection;
  if (options.sort !== 'title') sortStage.title = 1;
  sortStage._id = 1;

  const computedFields = {
    sortLag: {
      $max: [0, { $subtract: [{ $ifNull: ['$airedEpisodes', 0] }, { $ifNull: ['$watchedEpisodes', 0] }] }]
    },
    statusRank: {
      $switch: {
        branches: [
          { case: { $eq: ['$status', 'watching'] }, then: 1 },
          { case: { $eq: ['$status', 'wish'] }, then: 2 },
          { case: { $eq: ['$status', 'watched'] }, then: 3 },
          { case: { $eq: ['$status', 'dropped'] }, then: 4 }
        ],
        default: 99
      }
    }
  };

  return [
    { $match: baseFilter },
    {
      $facet: {
        items: [
          { $match: fullFilter },
          { $addFields: computedFields },
          { $sort: sortStage },
          { $skip: options.skip },
          { $limit: options.limit },
          { $project: { userId: 0, __v: 0, sortLag: 0, statusRank: 0 } }
        ],
        total: [
          { $match: fullFilter },
          { $count: 'count' }
        ],
        allCount: [{ $count: 'count' }],
        statusCounts: [
          { $match: buildFilter(options, ['status']) },
          { $group: { _id: '$status', count: { $sum: 1 } } }
        ],
        categoryCounts: [
          { $match: buildFilter(options, ['category']) },
          { $group: { _id: '$category', count: { $sum: 1 } } }
        ],
        networkTotal: [
          { $match: buildFilter(options, ['network']) },
          { $count: 'count' }
        ],
        networks: [
          { $match: { ...buildFilter(options, ['network']), network: { $type: 'string', $ne: '' } } },
          { $group: { _id: '$network', logo: { $first: '$networkLogo' }, count: { $sum: 1 } } },
          { $sort: { _id: 1 } },
          { $project: { _id: 0, name: '$_id', logo: 1, count: 1 } }
        ]
      }
    }
  ];
};

module.exports = {
  QueryValidationError,
  SHOW_CATEGORIES,
  SHOW_STATUSES,
  buildShowListPipeline,
  parseShowQuery
};
