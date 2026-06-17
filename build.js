const fs = require('fs');
const path = require('path');

const envFile = path.join(__dirname, 'frontend', 'env.js');
const apiUrl = process.env.API_URL || 'http://localhost:5000/api';

if (!fs.existsSync(envFile)) {
    console.error('env.js not found');
    process.exit(1);
}

let content = fs.readFileSync(envFile, 'utf8');
content = content.replace('{{API_URL}}', apiUrl);
fs.writeFileSync(envFile, content, 'utf8');
console.log(`✅ env.js updated with API_URL: ${apiUrl}`);
