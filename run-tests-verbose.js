import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('=== Running All Jest Tests (Verbose) ===');
console.log('Current directory:', __dirname);

const jestPath = join(__dirname, 'node_modules', 'jest', 'bin', 'jest.js');
const outputFile = join(__dirname, 'test-results-verbose.txt');

console.log('Jest path:', jestPath);
console.log('Output file:', outputFile);
console.log('\n=== Executing all tests ===\n');

const result = spawnSync('node', ['--experimental-vm-modules', jestPath, '--verbose', '--no-coverage'], {
  cwd: __dirname,
  encoding: 'utf8',
  timeout: 300000
});

let output = '';
if (result.stdout) {
  console.log('=== STDOUT ===');
  console.log(result.stdout);
  output += '=== STDOUT ===\n' + result.stdout;
}
if (result.stderr) {
  console.log('=== STDERR ===');
  console.log(result.stderr);
  output += '\n=== STDERR ===\n' + result.stderr;
}

fs.writeFileSync(outputFile, output, 'utf8');

console.log('\n=== Test Results ===');
console.log('Exit code:', result.status);
console.log('Results saved to:', outputFile);

if (result.status === 0) {
  console.log('✓ All tests passed!');
} else {
  console.log('✗ Some tests failed');
}

process.exit(result.status || 0);
