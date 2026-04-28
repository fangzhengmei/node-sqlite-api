export const buildPagination = (page, limit) => {
    const parsedPage = parseInt(page) > 0 ? parseInt(page) : 1;
    const parsedLimit = parseInt(limit) > 0 ? parseInt(limit) : 10;
    const startIndex = (parsedPage - 1) * parsedLimit;
    return {
        page: parsedPage,
        limit: parsedLimit,
        startIndex,
        limitClause: 'LIMIT ? OFFSET ?',
        limitParams: [parsedLimit, startIndex]
    };
};

export const buildOrderBy = (order, sort, allowedSortFields = []) => {
    const parsedOrder = order && order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    
    if (sort && allowedSortFields.length > 0 && allowedSortFields.includes(sort)) {
        return {
            order: parsedOrder,
            sortField: sort,
            orderByClause: `ORDER BY ${sort} ${parsedOrder}`
        };
    }
    
    return {
        order: parsedOrder,
        sortField: null,
        orderByClause: ''
    };
};

export const buildWhereClause = (conditions = []) => {
    const searchFields = [];
    const params = [];
    
    conditions.forEach(condition => {
        if (condition.value !== undefined && condition.value !== null && condition.value !== '') {
            searchFields.push(condition.field);
            if (Array.isArray(condition.value)) {
                params.push(...condition.value);
            } else {
                params.push(condition.value);
            }
        }
    });
    
    if (searchFields.length > 0) {
        return {
            whereClause: `WHERE ${searchFields.join(' AND ')}`,
            params
        };
    }
    
    return {
        whereClause: '',
        params
    };
};
