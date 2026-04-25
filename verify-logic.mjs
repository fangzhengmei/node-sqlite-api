import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('========================================');
console.log('Verifying Book Query Logic');
console.log('========================================');
console.log('');

let allPassed = true;
const results = [];

function assert(condition, message) {
  if (condition) {
    console.log('✅ PASS:', message);
    results.push({ passed: true, message });
  } else {
    console.log('❌ FAIL:', message);
    results.push({ passed: false, message });
    allPassed = false;
  }
}

function sqlContains(sql, ...substrings) {
  for (const substr of substrings) {
    if (!sql.includes(substr)) {
      return false;
    }
  }
  return true;
}

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

console.log('Test 1: Default query params');
{
  const { sql, params } = buildQuery({});
  console.log('  SQL:', sql.substring(0, 100) + '...');
  console.log('  Params:', params);
  assert(
    sqlContains(sql, 'SELECT', 'JOIN', 'LIMIT ?', 'OFFSET ?'),
    'Default query has basic structure'
  );
  assert(
    params.length === 2 && params[0] === 10 && params[1] === 0,
    'Default params: limit=10, offset=0'
  );
  assert(
    !sql.includes('WHERE'),
    'Default query has no WHERE clause'
  );
}

console.log('');
console.log('Test 2: Title filter only');
{
  const { sql, params } = buildQuery({ title: 'harry' });
  console.log('  SQL:', sql);
  console.log('  Params:', params);
  assert(
    sqlContains(sql, 'LOWER(books.title) LIKE LOWER(?)'),
    'Title filter uses LOWER() for case-insensitivity'
  );
  assert(
    params.length === 3 && params[0] === '%harry%',
    'Title param wrapped in % for fuzzy search'
  );
  assert(
    sql.includes('WHERE'),
    'Query has WHERE clause'
  );
}

console.log('');
console.log('Test 3: Author filter only (case-insensitive)');
{
  const { sql, params } = buildQuery({ author: 'rOwLiNg' });
  console.log('  SQL:', sql);
  console.log('  Params:', params);
  assert(
    sqlContains(sql, 'LOWER(authors.name) LIKE LOWER(?)'),
    'Author filter uses LOWER() for case-insensitivity'
  );
  assert(
    params.length === 3 && params[0] === '%rOwLiNg%',
    'Author param preserved as-is (database LOWER handles case)'
  );
}

console.log('');
console.log('Test 4: Title + Year filters together');
{
  const { sql, params } = buildQuery({ title: 'Test', year: '2025' });
  console.log('  SQL:', sql);
  console.log('  Params:', params);
  assert(
    sqlContains(sql, 'LOWER(books.title) LIKE LOWER(?)', 'AND', 'books.published_year = ?'),
    'Multiple filters joined with AND'
  );
  assert(
    params.length === 4 && params[0] === '%Test%' && params[1] === '2025',
    'Params in correct order: title, year, limit, offset'
  );
}

console.log('');
console.log('Test 5: Title + Author filters together (key scenario)');
{
  const { sql, params } = buildQuery({ title: 'Harry', author: 'Rowling' });
  console.log('  SQL:', sql);
  console.log('  Params:', params);
  assert(
    sqlContains(sql, 'LOWER(books.title) LIKE LOWER(?)', 'AND', 'LOWER(authors.name) LIKE LOWER(?)'),
    'Title + Author filters both use LOWER() and joined with AND'
  );
  assert(
    params.length === 4 && params[0] === '%Harry%' && params[1] === '%Rowling%',
    'Params in correct order: title, author, limit, offset'
  );
  assert(
    sql.split('WHERE').length === 2,
    'Only one WHERE clause (no duplicate WHERE bug)'
  );
}

console.log('');
console.log('Test 6: All three filters: Title + Author + Year');
{
  const { sql, params } = buildQuery({ title: 'Potter', author: 'Rowling', year: '1997' });
  console.log('  SQL:', sql);
  console.log('  Params:', params);
  assert(
    sqlContains(
      sql, 
      'LOWER(books.title) LIKE LOWER(?)', 
      'AND', 
      'books.published_year = ?',
      'AND',
      'LOWER(authors.name) LIKE LOWER(?)'
    ),
    'All three filters present with AND joins'
  );
  assert(
    params.length === 5 && 
    params[0] === '%Potter%' && 
    params[1] === '1997' && 
    params[2] === '%Rowling%',
    'Params in correct order: title, year, author, limit, offset'
  );
}

console.log('');
console.log('Test 7: Mixed case input (hArRy)');
{
  const { sql, params } = buildQuery({ title: 'hArRy' });
  console.log('  SQL:', sql);
  console.log('  Params:', params);
  assert(
    sqlContains(sql, 'LOWER(books.title) LIKE LOWER(?)'),
    'SQL uses LOWER() for case-insensitive matching'
  );
  assert(
    params[0] === '%hArRy%',
    'Input case preserved in param (LOWER in SQL handles comparison)'
  );
}

console.log('');
console.log('========================================');
console.log('Summary:');
console.log('========================================');

const passed = results.filter(r => r.passed).length;
const failed = results.filter(r => !r.passed).length;

console.log(`Passed: ${passed}/${results.length}`);
console.log(`Failed: ${failed}/${results.length}`);

if (allPassed) {
  console.log('');
  console.log('🎉 ALL TESTS PASSED!');
  console.log('');
  console.log('Key verifications:');
  console.log('  1. ✅ Multi-condition filters use AND (no duplicate WHERE bug)');
  console.log('  2. ✅ Title filter uses LOWER() for case-insensitivity');
  console.log('  3. ✅ Author filter uses LOWER() for case-insensitivity');
  console.log('  4. ✅ Title + Author work correctly together');
  console.log('  5. ✅ All three filters (title+author+year) work together');
  console.log('  6. ✅ Mixed case input (hArRy, rOwLiNg) handled correctly');
  process.exit(0);
} else {
  console.log('');
  console.log('❌ SOME TESTS FAILED!');
  console.log('');
  console.log('Failed tests:');
  results.filter(r => !r.passed).forEach(r => {
    console.log('  -', r.message);
  });
  process.exit(1);
}
