import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('=== Running Single Test File ===');
console.log('Current directory:', __dirname);

const jestPath = join(__dirname, 'node_modules', 'jest', 'bin', 'jest.js');
const testFile = join(__dirname, 'tests', 'controllers', 'createAuthor.test.js');

console.log('Jest path:', jestPath);
console.log('Test file:', testFile);
console.log('\n=== Running test ===\n');

try {
    const output = execSync(`node "${jestPath}" "${testFile}" --verbose`, {
        cwd: __dirname,
        encoding: 'utf8',
        stdio: 'pipe',
        timeout: 300000
    });
    
    console.log(output);
    console.log('\n=== Test Results ===');
    console.log('✓ Test passed!');
    process.exit(0);
} catch (error) {
    if (error.stdout) {
        console.log(error.stdout);
    }
    if (error.stderr) {
        console.error(error.stderr);
    }
    console.log('\n=== Test Results ===');
    console.log('✗ Test failed with exit code:', error.status);
    process.exit(error.status || 1);
}
