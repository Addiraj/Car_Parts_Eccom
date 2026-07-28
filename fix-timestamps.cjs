const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src', 'lib', 'db', 'generated_models');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.ts') && f !== 'init-models.ts');

for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (content.includes('timestamps: true') && !content.includes('createdAt:')) {
    // Determine if the model has an updated_at field by checking interface
    const hasUpdatedAt = content.includes('updated_at: Date;');
    
    // Add createdAt and updatedAt after timestamps: true,
    const replacement = hasUpdatedAt
      ? 'timestamps: true,\n    createdAt: "created_at",\n    updatedAt: "updated_at",'
      : 'timestamps: true,\n    createdAt: "created_at",\n    updatedAt: false,';
      
    content = content.replace(/timestamps:\s*true,/, replacement);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${file}`);
  }
}
