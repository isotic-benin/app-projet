const fs = require('fs');
const path = require('path');

let count = 0;

function processFile(filePath) {
    if (filePath.includes('node_modules') || filePath.includes('.next') || filePath.includes('convertEu2.js')) return;

    let original = fs.readFileSync(filePath, 'utf-8');
    let content = original.replace(/FCFA/g, '€');

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf-8');
        count++;
    }
}

function processDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDir(fullPath);
        } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
            processFile(fullPath);
        }
    }
}

processDir(path.join(__dirname, '../src'));
console.log(`Updated ${count} files replacing FCFA with €.`);
