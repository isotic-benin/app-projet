const fs = require('fs');
const glob = require('glob');
const path = require('path');

const replacements = [
    { search: /15\s?000\s?000/g, replace: '150000' },
    { search: /10\s?000\s?000/g, replace: '100000' },
    { search: /5\s?000\s?000/g, replace: '50000' },
    { search: /1\s?000\s?000/g, replace: '10000' },
    { search: /500\s?000/g, replace: '5000' },
    { search: /100\s?000/g, replace: '1000' },
    { search: /50\s?000/g, replace: '500' },
    { search: /10\s?000/g, replace: '100' },
    // Also space strings in UI
    { search: /150000/g, replace: '150 000' },
    { search: /100000/g, replace: '100 000' },
    { search: /50000/g, replace: '50 000' },
    // Only in strings where appropriate? No, wait. 
    // replacing 150000 with 150 000 will break JS numbers.
    // Let's do it safely.
];

const REPLACEMENTS_FULL = [
    // JS exact integers
    { search: /15000000/g, replace: '150000' },
    { search: /10000000/g, replace: '100000' },
    { search: /5000000/g, replace: '50000' },
    { search: /1000000/g, replace: '10000' },
    { search: /500000/g, replace: '5000' },
    { search: /100000/g, replace: '1000' },
    { search: /50000/g, replace: '500' },
    { search: /10000/g, replace: '100' },

    // UI Spaced strings
    { search: /15 000 000/g, replace: '150 000' },
    { search: /10 000 000/g, replace: '100 000' },
    { search: /5 000 000/g, replace: '50 000' },
    { search: /1 000 000/g, replace: '10 000' },
    { search: /500 000/g, replace: '5 000' },
    { search: /100 000/g, replace: '1 000' },
    { search: /10 000/g, replace: '100' },
];


let count = 0;

function processFile(filePath) {
    if (filePath.includes('node_modules') || filePath.includes('.next') || filePath.includes('convertEu.js')) return;

    let original = fs.readFileSync(filePath, 'utf-8');
    let content = original;

    // First, fix the 1000000 centimes conversion for 10000 in api/depot/route.ts
    // Wait, the API used '1000000' for accountBalance += 1000000 (meaning 10000 * 100).
    // Let's rely on the replacements above which replaces 1000000 with 10000.

    for (const rep of REPLACEMENTS_FULL) {
        content = content.replace(rep.search, rep.replace);
    }

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
console.log(`Updated ${count} files with new EUR values.`);
