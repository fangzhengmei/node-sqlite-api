import { execSync, spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('=== Running Jest Tests with ESM Support ===');
console.log('Current directory:', __dirname);

const jestPath = join(__dirname, 'node_modules', 'jest', 'bin', 'jest.js');

console.log('Jest path:', jestPath);
console.log('\n=== Running tests with --experimental-vm-modules ===\n');

try {
    const result = spawnSync('node', ['--experimental-vm-modules', jestPath], {
        cwd: __dirname,
        stdio: 'inherit',
        shell: true,
        timeout: 300000
    });
    
    console.log('\n=== Test Results ===');
    console.log('Exit code:', result.status);
    if (result.status === 0) {
        console.log('✓ All tests passed!');
    } else {
        console.log('✗ Some tests failed');
    }
    process.exit(result.status);
} catch (error) {
    console.error('Error during test run:', error.message);
    process.exit(1);
}
