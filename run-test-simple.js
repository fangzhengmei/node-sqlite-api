import { exec } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('=== Running Jest Tests ===');
console.log('Working directory:', __dirname);

const command = 'node --experimental-vm-modules node_modules/jest/bin/jest.js --verbose --no-coverage';

const child = exec(command, {
  cwd: __dirname,
  maxBuffer: 1024 * 1024 * 10
});

child.stdout.on('data', (data) => {
  console.log(data);
});

child.stderr.on('data', (data) => {
  console.error(data);
});

child.on('close', (code) => {
  console.log('\n=== Test Execution Complete ===');
  console.log('Exit code:', code);
  if (code === 0) {
    console.log('✓ All tests passed!');
  } else {
    console.log('✗ Some tests failed');
  }
  process.exit(code);
});
