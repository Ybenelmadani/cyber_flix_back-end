const fs = require('fs');
const path = require('path');

const baseDir = 'c:/Users/pc/Desktop/the Movies/cyberflix-backend';

function searchDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git') {
        searchDirectory(fullPath);
      }
    } else {
      if (file.endsWith('.js') || file.endsWith('.json') || file.endsWith('.md')) {
        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          if (content.toLowerCase().includes('codespecters')) {
            console.log(`Found 'codespecters' in: ${fullPath}`);
            const lines = content.split('\n');
            lines.forEach((line, index) => {
              if (line.toLowerCase().includes('codespecters')) {
                console.log(`  Line ${index + 1}: ${line.trim()}`);
              }
            });
          }
        } catch (err) {
          // ignore
        }
      }
    }
  }
}

searchDirectory(baseDir);
