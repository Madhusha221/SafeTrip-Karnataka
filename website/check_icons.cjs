const fs = require('fs');
const path = require('path');
const lucide = require('lucide-react');

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const matches = content.matchAll(/import\s+\{([^}]+)\}\s+from\s+['"]lucide-react['"]/g);
  for (const m of matches) {
    const icons = m[1].split(',').map(s => s.trim()).filter(Boolean);
    for (const icon of icons) {
      if (!lucide[icon]) {
        console.error('MISSING ICON:', icon, 'in file:', filePath);
      }
    }
  }
}

function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (p.endsWith('.jsx') || p.endsWith('.js')) checkFile(p);
  }
}

walk('./src');
console.log('Icon import check done.');
