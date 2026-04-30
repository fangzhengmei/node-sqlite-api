import { execSync, spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('=== Running Jest Tests ===');
console.log('Current directory:', __dirname);

// Try different ways to run jest
console.log('Trying to use node to run jest directly...');
const jestNodePath = join(__dirname, 'node_modules', 'jest', 'bin', 'jest.js');

if (fs.existsSync(jestNodePath)) {
    console.log('Found jest.js at:', jestNodePath);
    
    console.log('\n=== Running node node_modules/jest/bin/jest.js ===');
    try {
        const result = spawnSync('node', [jestNodePath], {
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
} else {
    console.error('Jest not found at:', jestNodePath);
    console.error('Please run npm install first');
    process.exit(1);
}
