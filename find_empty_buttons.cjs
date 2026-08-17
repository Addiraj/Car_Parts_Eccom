const fs = require('fs');
const path = require('path');

function searchDir(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      searchDir(filePath, fileList);
    } else if (filePath.endsWith('.tsx')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const allTsx = searchDir(path.join(process.cwd(), 'src'));
const issues = [];

for (const file of allTsx) {
  const content = fs.readFileSync(file, 'utf-8');
  const lines = content.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // basic regex for <Button ... >
    // this is rudimentary but finds most
    if (line.includes('<Button')) {
      // check if the line or next lines have onClick, asChild, type="submit"
      // we can just check the whole tag block.
      let block = line;
      let j = i;
      while (!block.includes('>') && j < lines.length - 1) {
        j++;
        block += ' ' + lines[j];
      }
      
      if (!block.includes('onClick') && !block.includes('asChild') && !block.includes('type="submit"') && !block.includes('href') && !block.includes('disabled')) {
        // also check if wrapped in <Link> or <a> or <form>
        // this is harder but let's just flag it for review
        issues.push(`${file.replace(process.cwd(), '')}:${i + 1}: ${block.trim()}`);
      }
    }
  }
}

console.log(issues.join('\n'));
