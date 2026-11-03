import fs from 'node:fs';

let content = fs.readFileSync('public/app.js', 'utf8');
const lines = content.split(/\r?\n/);

console.log('Total lines before:', lines.length);

// Look around line 560-585
for (let i = 555; i < 585; i++) {
  console.log(`${i+1}: ${lines[i]}`);
}

// Find the line that has '});' followed by 'if (appState) appState.images = appState.images.filter'
let foundIndex = -1;
for (let i = 550; i < 590; i++) {
  if (lines[i]?.includes('appState.images = appState.images.filter')) {
    foundIndex = i;
    break;
  }
}

if (foundIndex !== -1) {
  console.log(`Found orphaned block around line ${foundIndex+1}`);
  // lines to remove: foundIndex - 1 (the '});'), foundIndex, foundIndex+1, foundIndex+2, foundIndex+3, foundIndex+4, foundIndex+5
  // Let's inspect what lines are there
  console.log('Removing lines:', lines.slice(foundIndex - 1, foundIndex + 6));
  lines.splice(foundIndex - 1, 7);
  fs.writeFileSync('public/app.js', lines.join('\n'), 'utf8');
  console.log('✅ Successfully removed orphaned block from public/app.js');
} else {
  console.error('❌ Could not locate orphaned block');
}
