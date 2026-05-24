const fs = require('fs');
const path = require('path');

const baseDir = path.join(process.cwd(), 'public', 'icons', 'aws-icons');
const icons = [];

const categories = fs.readdirSync(baseDir);
for (const category of categories) {
  const categoryPath = path.join(baseDir, category);
  if (fs.statSync(categoryPath).isDirectory()) {
    const files = fs.readdirSync(categoryPath);
    for (const file of files) {
      if (file.endsWith('.svg')) {
        const serviceName = file.replace('.svg', '');
        icons.push({
          provider: 'aws',
          category,
          service_name: serviceName,
          filename: file,
          icon_url: `/icons/aws-icons/${category}/${file}`,
          tags: [],
          description: '',
          aliases: [],
          is_active: true
        });
      }
    }
  }
}

if (!fs.existsSync('db')) fs.mkdirSync('db');
fs.writeFileSync('db/icons.json', JSON.stringify({ icons }, null, 2));
console.log('Local icon DB created at db/icons.json'); 