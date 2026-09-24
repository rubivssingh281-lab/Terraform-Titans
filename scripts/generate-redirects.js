import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distDir = path.resolve(__dirname, '../dist');
const redirectsPath = path.join(distDir, '_redirects');

const backendUrl = process.env.VITE_API_URL || process.env.BACKEND_URL || '';

let redirectsContent = '';
if (backendUrl) {
  const cleanUrl = backendUrl.replace(/\/$/, '');
  redirectsContent += `/api/*  ${cleanUrl}/api/:splat  200\n`;
}
redirectsContent += `/*  /index.html  200\n`;

try {
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }
  fs.writeFileSync(redirectsPath, redirectsContent);
  console.log(`Generated _redirects file successfully at ${redirectsPath}`);
} catch (err) {
  console.error('Error generating _redirects:', err);
}
