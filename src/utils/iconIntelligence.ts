import fs from 'fs';
import path from 'path';

export interface AwsIconMeta {
  category: string;
  service: string;
  filename: string;
  iconPath: string;
}

// Recursively scan the aws-icons directory for SVG files
export function scanAwsIcons(baseDir: string = path.join(process.cwd(), 'public', 'icons', 'aws-icons')): AwsIconMeta[] {
  const icons: AwsIconMeta[] = [];

  function walk(dir: string, category: string) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        walk(fullPath, file); // file is the subcategory
      } else if (file.endsWith('.svg')) {
        icons.push({
          category,
          service: file.replace('.svg', ''),
          filename: file,
          iconPath: `/icons/aws-icons/${category}/${file}`,
        });
      }
    }
  }

  // Top-level categories
  const categories = fs.readdirSync(baseDir);
  for (const category of categories) {
    const categoryPath = path.join(baseDir, category);
    if (fs.statSync(categoryPath).isDirectory()) {
      walk(categoryPath, category);
    }
  }

  return icons;
}

// Simple fuzzy match: returns icons whose service or filename includes the intent keyword (case-insensitive)
export function matchIconsByIntent(intent: string, icons: AwsIconMeta[]): AwsIconMeta[] {
  const keywords = intent.toLowerCase().split(/\s|,|\./).filter(Boolean);
  return icons.filter(icon =>
    keywords.some(kw =>
      icon.service.toLowerCase().includes(kw) ||
      icon.filename.toLowerCase().includes(kw) ||
      icon.category.toLowerCase().includes(kw)
    )
  );
} 