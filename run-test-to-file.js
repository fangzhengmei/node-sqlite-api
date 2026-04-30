import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('=== Running Jest Tests ===');
console.log('Working directory:', __dirname);

const outputFile = join(__dirname, 'test-output.txt');
const logStream = fs.createWriteStream(outputFile);

const jestPath = join(__dirname, 'node_modules', 'jest', 'bin', 'jest.js');

const child = spawn('node', ['--experimental-vm-modules', jestPath, '--verbose', '--no-coverage'], {
  cwd: __dirname,
  stdio: ['ignore', 'pipe', 'pipe']
});

child.stdout.on('data', (data) => {
  const str = data.toString();
  process.stdout.write(str);
  logStream.write(str);
});

child.stderr.on('data', (data) => {
  const str = data.toString();
  process.stderr.write(str);
  logStream.write(str);
});

child.on('close', (code) => {
  logStream.end();
  console.log('\n=== Test Execution Complete ===');
  console.log('Exit code:', code);
  console.log('Output written to:', outputFile);
  if (code === 0) {
    console.log('✓ All tests passed!');
  } else {
    console.log('✗ Some tests failed');
  }
  process.exit(code);
});
