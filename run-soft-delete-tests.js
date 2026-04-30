import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('=== Running All Soft Delete Related Tests ===');
console.log('Current directory:', __dirname);

const jestPath = join(__dirname, 'node_modules', 'jest', 'bin', 'jest.js');

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

try {
    const testFilesArg = testFiles.map(f => `"${f}"`).join(' ');
    const cmd = `node --experimental-vm-modules "${jestPath}" ${testFilesArg} --verbose --no-coverage`;
    
    console.log('Command:', cmd);
    console.log('');
    
    const output = execSync(cmd, {
        cwd: __dirname,
        encoding: 'utf8',
        timeout: 300000,
        stdio: ['pipe', 'pipe', 'pipe']
    });
    
    console.log(output);
    console.log('\n=== Test Results ===');
    console.log('✓ All tests passed!');
    
    const resultFile = join(__dirname, 'soft-delete-test-results.txt');
    fs.writeFileSync(resultFile, output, 'utf8');
    console.log('Results saved to:', resultFile);
    
    process.exit(0);
} catch (error) {
    if (error.stdout) {
        console.log('=== STDOUT ===');
        console.log(error.stdout);
    }
    if (error.stderr) {
        console.log('=== STDERR ===');
        console.log(error.stderr);
    }
    console.log('\n=== Test Results ===');
    console.log('Exit code:', error.status);
    if (error.status === 0) {
        console.log('✓ All tests passed!');
    } else {
        console.log('✗ Some tests failed');
    }
    
    const resultFile = join(__dirname, 'soft-delete-test-results.txt');
    const allOutput = (error.stdout || '') + '\n' + (error.stderr || '');
    fs.writeFileSync(resultFile, allOutput, 'utf8');
    console.log('Results saved to:', resultFile);
    
    process.exit(error.status || 1);
}
