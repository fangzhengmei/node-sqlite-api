const { execSync } = require('child_process');
const { join } = require('path');
const fs = require('fs');

console.log('=== Running All Jest Tests ===');

const jestPath = join(__dirname, 'node_modules', 'jest', 'bin', 'jest.js');
const outputFile = join(__dirname, 'test-results-final.txt');

const testFiles = [
    'tests/controllers/createAuthor.test.js',
    'tests/controllers/getAuthors.test.js',
    'tests/controllers/createBook.test.js',
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
testFiles.forEach((file, index) => {
    console.log(`  ${index + 1}. ${file}`);
});
console.log('\nJest path:', jestPath);
console.log('Output file:', outputFile);
console.log('\n=== Executing tests ===\n');

try {
    const args = ['--experimental-vm-modules', jestPath, '--verbose', '--no-coverage', ...testFiles];
    const output = execSync(`node ${args.join(' ')}`, {
        cwd: __dirname,
        encoding: 'utf8',
        timeout: 600000,
        stdio: ['pipe', 'pipe', 'pipe']
    });
    
    console.log(output);
    fs.writeFileSync(outputFile, output, 'utf8');
    
    console.log('\n=== Test Results ===');
    console.log('✓ All tests passed!');
    console.log('Results saved to:', outputFile);
    process.exit(0);
} catch (error) {
    let output = '';
    if (error.stdout) {
        output += error.stdout;
        console.log('=== STDOUT ===');
        console.log(error.stdout);
    }
    if (error.stderr) {
        output += error.stderr;
        console.log('=== STDERR ===');
        console.log(error.stderr);
    }
    
    fs.writeFileSync(outputFile, output, 'utf8');
    
    console.log('\n=== Test Results ===');
    console.log('Exit code:', error.status);
    console.log('Results saved to:', outputFile);
    
    if (error.status === 0) {
        console.log('✓ All tests passed!');
    } else {
        console.log('✗ Some tests failed');
    }
    process.exit(error.status || 1);
}
