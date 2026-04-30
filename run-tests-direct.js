import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('=== Running Jest Tests Directly ===');
console.log('Current directory:', __dirname);

const jestPath = join(__dirname, 'node_modules', 'jest', 'bin', 'jest.js');

console.log('Jest path:', jestPath);
console.log('\n=== Executing: node --experimental-vm-modules ' + jestPath + ' ===\n');

const result = spawnSync('node', ['--experimental-vm-modules', jestPath], {
  cwd: __dirname,
  encoding: 'utf8',
  timeout: 300000
});

if (result.stdout) {
  console.log('=== STDOUT ===');
  console.log(result.stdout);
}

if (result.stderr) {
  console.log('=== STDERR ===');
  console.log(result.stderr);
}

console.log('\n=== Test Results ===');
console.log('Exit code:', result.status);
if (result.status === 0) {
  console.log('✓ All tests passed!');
} else {
  console.log('✗ Some tests failed');
}

process.exit(result.status || 0);
