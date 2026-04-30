import { execSync, spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('=== Debug Information ===');
console.log('Current directory:', __dirname);
console.log('Files in directory:', fs.readdirSync(__dirname));

console.log('\n=== Checking npm path ===');
try {
    const whichNpm = execSync('where npm', { encoding: 'utf8', shell: true });
    console.log('npm location:', whichNpm.trim());
} catch (e) {
    console.log('Error finding npm:', e.message);
}

console.log('\n=== Running npm install with spawnSync ===');
try {
    const result = spawnSync('npm', ['install'], {
        cwd: __dirname,
        stdio: 'inherit',
        shell: true,
        timeout: 120000
    });
    
    console.log('\n=== Results ===');
    console.log('Exit code:', result.status);
    console.log('Error:', result.error ? result.error.message : 'none');
    console.log('Signal:', result.signal);
    console.log('Files in directory after install:', fs.readdirSync(__dirname));
} catch (error) {
    console.error('Error during npm install:', error.message);
    console.error('Stack:', error.stack);
}
