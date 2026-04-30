import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('=== Running Jest Tests with ESM Support ===');
console.log('Current directory:', __dirname);

const jestPath = join(__dirname, 'node_modules', 'jest', 'bin', 'jest.js');
const outputFile = join(__dirname, 'test-output.txt');

console.log('Jest path:', jestPath);
console.log('Output file:', outputFile);
console.log('\n=== Running tests with --experimental-vm-modules ===\n');

const outputStream = fs.createWriteStream(outputFile, { flags: 'w' });

const proc = spawn('node', ['--experimental-vm-modules', jestPath, '--verbose'], {
    cwd: __dirname,
    shell: true
});

proc.stdout.on('data', (data) => {
    const text = data.toString();
    process.stdout.write(text);
    outputStream.write(text);
});

proc.stderr.on('data', (data) => {
    const text = data.toString();
    process.stderr.write(text);
    outputStream.write(text);
});

proc.on('close', (code) => {
    outputStream.end();
    console.log('\n=== Test Results ===');
    console.log('Exit code:', code);
    if (code === 0) {
        console.log('✓ All tests passed!');
    } else {
        console.log('✗ Some tests failed');
    }
    console.log('Output saved to:', outputFile);
    process.exit(code);
});
