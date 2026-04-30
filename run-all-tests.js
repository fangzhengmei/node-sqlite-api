import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('=== Running All Jest Tests ===');
console.log('Current directory:', __dirname);

const jestPath = join(__dirname, 'node_modules', 'jest', 'bin', 'jest.js');
const outputFile = join(__dirname, 'test-results.txt');

console.log('Jest path:', jestPath);
console.log('Output file:', outputFile);
console.log('\n=== Executing all tests ===\n');

try {
  const output = execSync(`node --experimental-vm-modules "${jestPath}" --verbose`, {
    cwd: __dirname,
    encoding: 'utf8',
    timeout: 300000
  });
  
  console.log(output);
  fs.writeFileSync(outputFile, output, 'utf8');
  
  console.log('\n=== Test Results ===');
  console.log('✓ All tests passed!');
  console.log('Results saved to:', outputFile);
  process.exit(0);
} catch (error) {
  let output = '';
  if (error.stdout) {
    output += error.stdout;
    console.log('=== STDOUT ===');
    console.log(error.stdout);
  }
  if (error.stderr) {
    output += error.stderr;
    console.log('=== STDERR ===');
    console.log(error.stderr);
  }
  
  fs.writeFileSync(outputFile, output, 'utf8');
  
  console.log('\n=== Test Results ===');
  console.log('Exit code:', error.status);
  console.log('Results saved to:', outputFile);
  
  if (error.status === 0) {
    console.log('✓ All tests passed!');
  } else {
    console.log('✗ Some tests failed');
  }
  process.exit(error.status || 1);
}
