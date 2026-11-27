// Backend-only loader (the frontend has its own configData.js that imports the same JSON the bundler way).
import fs from 'node:fs';

export default JSON.parse(fs.readFileSync(new URL('./siteConfig.json', import.meta.url), 'utf8'));
