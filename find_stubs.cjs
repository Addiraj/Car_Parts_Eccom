const fs = require('fs');
const path = require('path');

function searchDir(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      searchDir(filePath, fileList);
    } else if (filePath.endsWith('.ts') && !filePath.includes('.test.') && !filePath.includes('generated_models')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const allTs = searchDir(path.join(process.cwd(), 'src', 'lib'));
const issues = [];

for (const file of allTs) {
  const content = fs.readFileSync(file, 'utf-8');
  // looking for functions that just return {} or [] or {ok: true} without await db
  // This is a bit heuristic.
  if (content.includes('// TODO')) {
    issues.push(`TODO found in ${file.replace(process.cwd(), '')}`);
  }
  if (content.includes('console.log') && !file.includes('db/index.server.ts')) {
    issues.push(`console.log found in ${file.replace(process.cwd(), '')}`);
  }
}

console.log(issues.join('\n'));
