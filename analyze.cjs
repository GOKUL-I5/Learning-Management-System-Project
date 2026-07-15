const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.jsx')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('d:/ksquarestudios/Ktrax/Ktrax/src/pages');
files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const buttonRegex = /<button([^>]*)>/g;
  let match;
  let missing = [];
  while ((match = buttonRegex.exec(content)) !== null) {
    const btn = match[0];
    if (!btn.includes('onClick') && !btn.includes('type=\"submit\"') && !btn.includes("type='submit'")) {
      missing.push(btn);
    }
  }
  if (missing.length > 0) {
    console.log(path.basename(file) + ': ' + missing.length + ' button(s) potentially missing handlers');
    missing.forEach(b => console.log('  ' + b));
  }
});
