const { execSync, spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const projectDir = path.resolve(__dirname);

console.log('=== Running All Soft Delete Related Tests ===');
console.log('Current directory:', __dirname);

const jestPath = path.join(__dirname, 'node_modules', 'jest', 'bin', 'jest.js');

const testFiles = [
    'tests/controllers/createAuthor.test.js',
    'tests/controllers/createBook.test.js',
    'tests/controllers/getAuthors.test.js',
    'tests/controllers/getBooks.test.js',
    'tests/controllers/updateBook.test.js',
    'tests/controllers/deleteAuthor.test.js',
    'tests/controllers/deleteBook.test.js',
    'tests/controllers/getDeletedAuthors.test.js',
    'tests/controllers/getDeletedBooks.test.js',
    'tests/controllers/getSingleDeletedAuthor.test.js',
    'tests/controllers/getSingleDeletedBook.test.js',
    'tests/controllers/restoreAuthor.test.js',
    'tests/controllers/restoreBook.test.js'
];

console.log('Test files to run:');
testFiles.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));
console.log('\nJest path:', jestPath);
console.log('\n=== Executing tests ===\n');

const args = [
    '--experimental-vm-modules',
    jestPath,
    ...testFiles,
    '--verbose',
    '--no-coverage'
];

console.log('Node args:', args.join(' '));
console.log('');

const result = spawnSync('node', args, {
    cwd: __dirname,
    encoding: 'utf8',
    timeout: 300000
});

console.log('=== STDOUT ===');
console.log(result.stdout || '(no stdout)');

if (result.stderr && result.stderr.trim()) {
    console.log('\n=== STDERR ===');
    console.log(result.stderr);
}

console.log('\n=== Test Results ===');
console.log('Exit code:', result.status);

if (result.status === 0) {
    console.log('✓ All tests passed!');
} else {
    console.log('✗ Some tests failed');
}

const resultFile = path.join(__dirname, 'soft-delete-test-results.txt');
const allOutput = 
    '=== STDOUT ===\n' + (result.stdout || '') + 
    '\n\n=== STDERR ===\n' + (result.stderr || '') +
    '\n\n=== Exit Code: ' + result.status + ' ===';

fs.writeFileSync(resultFile, allOutput, 'utf8');
console.log('\nResults saved to:', resultFile);

process.exit(result.status || 0);
