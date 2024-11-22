import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
// @ts-ignore
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
export const rootDir = path.join(__dirname, '../..');
