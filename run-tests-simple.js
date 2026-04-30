import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('=== Running Jest Tests ===');
console.log('Current directory:', __dirname);

const jestPath = join(__dirname, 'node_modules', 'jest', 'bin', 'jest.js');

console.log('Jest path:', jestPath);
console.log('\n=== Running tests ===\n');

try {
    const output = execSync(`node "${jestPath}"`, {
        cwd: __dirname,
        encoding: 'utf8',
        stdio: 'pipe',
        timeout: 300000
    });
    
    console.log(output);
    console.log('\n=== Test Results ===');
    console.log('✓ All tests passed!');
    process.exit(0);
} catch (error) {
    if (error.stdout) {
        console.log(error.stdout);
    }
    if (error.stderr) {
        console.error(error.stderr);
    }
    console.log('\n=== Test Results ===');
    console.log('✗ Some tests failed with exit code:', error.status);
    process.exit(error.status || 1);
}
