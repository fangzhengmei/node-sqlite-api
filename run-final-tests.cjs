const { spawn } = require('child_process');
const { join } = require('path');
const fs = require('fs');

console.log('=== Running All Jest Tests ===');

const jestPath = join(__dirname, 'node_modules', 'jest', 'bin', 'jest.js');
const outputFile = join(__dirname, 'test-results-final.txt');

console.log('Jest path:', jestPath);
console.log('Output file:', outputFile);
console.log('\n=== Executing all tests ===\n');

const logStream = fs.createWriteStream(outputFile);

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
    console.log('Results saved to:', outputFile);
    if (code === 0) {
        console.log('✓ All tests passed!');
    } else {
        console.log('✗ Some tests failed');
    }
    process.exit(code || 0);
});
