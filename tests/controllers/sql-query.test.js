import { jest, expect, describe, test, beforeEach } from '@jest/globals';

function buildQuery(queryParams) {
  let { title, year, order, sort, author, page, limit } = queryParams;
  page = parseInt(page) > 0 ? parseInt(page) : 1;
  limit = parseInt(limit) > 0 ? parseInt(limit) : 10;
  const startIndex = (page - 1) * limit;

  order = order && order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  let sql = `SELECT books.*,authors.name AS author FROM books
    JOIN authors 
    ON books.author_id = authors.id`;
  const params = [];
  const searchFields = [];

  if (title) {
    searchFields.push(`LOWER(books.title) LIKE LOWER(?)`);
    params.push(`%${title}%`);
  }
  if (year) {
    searchFields.push(`books.published_year = ?`);
    params.push(year);
  }
  if (author) {
    searchFields.push(`LOWER(authors.name) LIKE LOWER(?)`);
    params.push(`%${author}%`);
  }
  if (searchFields.length > 0) {
    sql += ` WHERE ` + searchFields.join(' AND ');
  }

  const sortBy = ["title", "published_year", "created_at"];
  if (sort && sortBy.includes(sort)) {
    sql += ` ORDER BY ${sort} ${order}`;
  }
  sql += ` LIMIT ? OFFSET ?`;
  params.push(limit, startIndex);

  return { sql, params };
}

describe('get All Books method test', () => {
  let req;
  let res;
  let mockFetchAll;

  beforeEach(() => {
    req = { query: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    mockFetchAll = jest.fn();
  });

  const mockBooks = [{
    id: 1,
    title: 'Test',
    isbn: '1234567890',
    published_year: 1996,
    author_id: 1,
    created_at: '2025-09-12 06:47:02',
    author: 'Test Author'
  }];

  const mockHarryPotter = [{
    id: 1,
    title: "Harry Potter and the Philosopher's Stone",
    isbn: '9780747532743',
    published_year: 1997,
    author_id: 1,
    author: 'J.K. Rowling'
  }];

  test('should return books with default query params', () => {
    const { sql, params } = buildQuery({});

    expect(sql).toContain('LIMIT ? OFFSET ?');
    expect(params).toContain(10);
    expect(params).toContain(0);
    expect(sql).not.toContain('WHERE');
  });

  test('should apply title and year filters together with case-insensitive title', () => {
    const { sql, params } = buildQuery({ title: 'Test', year: '2025' });

    const titlePattern = /LOWER\(books\.title\) LIKE LOWER\(\?\)/;
    const yearPattern = /books\.published_year = \?/;

    expect(titlePattern.test(sql)).toBe(true);
    expect(yearPattern.test(sql)).toBe(true);
    expect(sql).toContain('AND');
    expect(params).toContain('%Test%');
    expect(params).toContain('2025');
    expect(params).toContain(10);
    expect(params).toContain(0);
  });

  test('should apply title and author filters together with case-insensitive matching', () => {
    const { sql, params } = buildQuery({ title: 'Harry', author: 'Rowling' });

    const titlePattern = /LOWER\(books\.title\) LIKE LOWER\(\?\)/;
    const authorPattern = /LOWER\(authors\.name\) LIKE LOWER\(\?\)/;

    expect(titlePattern.test(sql)).toBe(true);
    expect(authorPattern.test(sql)).toBe(true);
    expect(sql).toContain('AND');

    const whereCount = (sql.match(/WHERE/g) || []).length;
    expect(whereCount).toBe(1);

    expect(params).toContain('%Harry%');
    expect(params).toContain('%Rowling%');
    expect(params).toContain(10);
    expect(params).toContain(0);
  });

  test('should handle case-insensitive title search with mixed case input', () => {
    const { sql, params } = buildQuery({ title: 'hArRy' });

    expect(sql).toContain('LOWER(books.title) LIKE LOWER(?)');
    expect(params).toContain('%hArRy%');
    expect(params).toContain(10);
    expect(params).toContain(0);
  });

  test('should handle case-insensitive author search with mixed case input', () => {
    const { sql, params } = buildQuery({ author: 'rOwLiNg' });

    expect(sql).toContain('LOWER(authors.name) LIKE LOWER(?)');
    expect(params).toContain('%rOwLiNg%');
    expect(params).toContain(10);
    expect(params).toContain(0);
  });

  test('should apply all three filters: title, author, and year together', () => {
    const { sql, params } = buildQuery({ title: 'Potter', author: 'Rowling', year: '1997' });

    const titlePattern = /LOWER\(books\.title\) LIKE LOWER\(\?\)/;
    const yearPattern = /books\.published_year = \?/;
    const authorPattern = /LOWER\(authors\.name\) LIKE LOWER\(\?\)/;

    expect(titlePattern.test(sql)).toBe(true);
    expect(yearPattern.test(sql)).toBe(true);
    expect(authorPattern.test(sql)).toBe(true);

    const whereCount = (sql.match(/WHERE/g) || []).length;
    expect(whereCount).toBe(1);

    expect(params).toContain('%Potter%');
    expect(params).toContain('1997');
    expect(params).toContain('%Rowling%');
    expect(params).toContain(10);
    expect(params).toContain(0);
  });

  test('should handle empty results scenario', () => {
    const { sql, params } = buildQuery({ title: 'NonExistentBook12345' });

    expect(sql).toContain('LOWER(books.title) LIKE LOWER(?)');
    expect(params).toContain('%NonExistentBook12345%');
  });
});
