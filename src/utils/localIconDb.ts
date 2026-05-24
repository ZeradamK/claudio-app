import fs from 'fs';
import path from 'path';

type Icon = {
  provider: string;
  category: string;
  service_name: string;
  filename: string;
  icon_url: string;
  tags?: string[];
  description?: string;
  aliases?: string[];
  is_active?: boolean;
};

type Data = { icons: Icon[] };

let cachedIcons: Icon[] | null = null;

export async function getIcons(filter: Partial<Icon> = {}): Promise<Icon[]> {
  try {
    // Load icons from file system (server-side only)
    if (!cachedIcons) {
      const dbPath = path.join(process.cwd(), 'db', 'icons.json');
      
      if (!fs.existsSync(dbPath)) {
        console.error('Icons database not found at:', dbPath);
        return [];
      }
      
      const data = fs.readFileSync(dbPath, 'utf8');
      const parsed: Data = JSON.parse(data);
      cachedIcons = parsed.icons || [];
    }
    
    let icons = cachedIcons.filter(i => i.is_active !== false);
    
    // Apply filters
    Object.entries(filter).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        icons = icons.filter(i => (i as any)[key] === value);
      }
    });
    
    return icons;
  } catch (error) {
    console.error('Error reading icons database:', error);
    return [];
  }
} 