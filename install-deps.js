import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('Running npm install...');
console.log('Current directory:', __dirname);

try {
    execSync('npm install', {
        cwd: __dirname,
        stdio: 'inherit',
        shell: true
    });
    console.log('npm install completed successfully!');
} catch (error) {
    console.error('npm install failed:', error.message);
    process.exit(1);
}
