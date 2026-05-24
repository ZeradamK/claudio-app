/**
 * Architecture Store Module
 * 
 * Provides functions for managing architecture data in the CloudMap application.
 * Uses localStorage for persistence in development.
 */

import { architectureStore } from '@/app/api/store';
import fs from 'fs';
import path from 'path';

/**
 * Architecture interface defining the expected structure
 */
export interface ArchitectureVersion {
  version: number;
  timestamp: string;
  nodes: any[];
  edges: any[];
  metadata?: any;
}

export interface Architecture {
  nodes: any[];
  edges: any[];
  metadata?: {
    prompt?: string;
    rationale?: string;
    cdkCode?: string;
    cdkLanguage?: string;
    lastEditedAt?: string;
    lastEditedBy?: string;
    [key: string]: any;
  };
  versions?: ArchitectureVersion[];
  currentVersion?: number;
}

// Hashtable for fast architecture lookup in current dev session
const architectureHashTable: Record<number, string> = {};
let nextHashKey = 1;

// Expose a function to get the current hashtable
export function getArchitectureHashTable() {
  return { ...architectureHashTable };
}

// Helper function to get store from localStorage or server memory
function getStoreFromStorage(): Record<string, Architecture> {
  if (typeof window === 'undefined') {
    // Server-side: use in-memory store
    return architectureStore;
  }
  
  try {
    // Client-side: try localStorage first
    const stored = localStorage.getItem('architectureStore');
    if (stored) {
      const parsedStore = JSON.parse(stored);
      // Sync with server store
      Object.assign(architectureStore, parsedStore);
      return parsedStore;
    }
    return architectureStore;
  } catch (error) {
    console.error('Error reading from localStorage:', error);
    return architectureStore;
  }
}

// Helper function to save store to localStorage and server memory
function saveStoreToStorage(store: Record<string, Architecture>) {
  // Update server-side store
  Object.assign(architectureStore, store);
  
  // Update client-side store if available
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('architectureStore', JSON.stringify(store));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }
}

/**
 * Get an architecture by ID
 */
export async function getArchitecture(architectureId: string): Promise<Architecture | null> {
  if (!architectureId) return null;
  
  // Get from store (either localStorage or server memory)
  const store = getStoreFromStorage();
  let architecture = store[architectureId];
  
  if (!architecture) {
    // Try to load from local file (server-side only)
    if (typeof window === 'undefined') {
      try {
        const dataDir = path.resolve(process.cwd(), 'data');
        const filePath = path.join(dataDir, `architecture-${architectureId}.json`);
        if (fs.existsSync(filePath)) {
          const fileContent = fs.readFileSync(filePath, 'utf-8');
          architecture = JSON.parse(fileContent);
          // Add to store for future use
          store[architectureId] = architecture;
          saveStoreToStorage(store);
          console.log(`Loaded architecture ${architectureId} from file.`);
        }
      } catch (err) {
        console.error(`Error loading architecture ${architectureId} from file:`, err);
      }
    }
  }
  
  if (!architecture) {
    console.warn(`Architecture ${architectureId} not found in store or file`);
    return null;
  }
  
  // Always return the latest version if versions exist
  if (architecture.versions && architecture.versions.length > 0) {
    const latest = architecture.versions[architecture.versions.length - 1];
    return {
      ...architecture,
      nodes: latest.nodes,
      edges: latest.edges,
      metadata: latest.metadata,
      currentVersion: latest.version,
    };
  }
  return architecture;
}

/**
 * Get an architecture version by ID and version number
 */
export async function getArchitectureVersion(architectureId: string, version: number): Promise<ArchitectureVersion | null> {
  const store = getStoreFromStorage();
  const architecture = store[architectureId];
  if (!architecture || !architecture.versions) return null;
  return architecture.versions.find((v: ArchitectureVersion) => v.version === version) || null;
}

/**
 * Save or update an architecture
 */
export async function saveArchitecture(
  architectureId: string, 
  architecture: Architecture, 
  editedBy: string = 'system'
): Promise<Architecture> {
  if (!architectureId) throw new Error('Architecture ID is required');
  
  // Update metadata
  const updatedArchitecture = {
    ...architecture,
    metadata: {
      ...architecture.metadata,
      lastEditedAt: new Date().toISOString(),
      lastEditedBy: editedBy
    }
  };
  
  // Get current store
  const store = getStoreFromStorage();
  let arch = store[architectureId] || {};
  
  // Versioning logic
  let versions = arch.versions || [];
  const newVersionNum = versions.length > 0 ? versions[versions.length - 1].version + 1 : 1;
  const newVersion: ArchitectureVersion = {
    version: newVersionNum,
    timestamp: new Date().toISOString(),
    nodes: updatedArchitecture.nodes,
    edges: updatedArchitecture.edges,
    metadata: updatedArchitecture.metadata,
  };
  versions.push(newVersion);
  
  // Update store
  store[architectureId] = {
    ...updatedArchitecture,
    versions,
    currentVersion: newVersionNum,
  };
  
  // Save to both storages
  saveStoreToStorage(store);
  
  // Add to hashtable if not present
  if (!Object.values(architectureHashTable).includes(architectureId)) {
    architectureHashTable[nextHashKey] = architectureId;
    nextHashKey++;
  }
  
  // Always write to /data/architecture-<id>.json for persistence
  if (typeof window === 'undefined') {
    try {
      const dataDir = path.resolve(process.cwd(), 'data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir);
      }
      const filePath = path.join(dataDir, `architecture-${architectureId}.json`);
      fs.writeFileSync(filePath, JSON.stringify(updatedArchitecture, null, 2), 'utf-8');
      console.log(`Saved architecture ${architectureId} to file.`);
    } catch (err) {
      console.error(`Error saving architecture ${architectureId} to file:`, err);
    }
  }
  
  return store[architectureId];
}

/**
 * Delete an architecture by ID
 */
export async function deleteArchitecture(architectureId: string): Promise<boolean> {
  if (!architectureId) return false;
  
  const store = getStoreFromStorage();
  
  if (store[architectureId]) {
    delete store[architectureId];
    saveStoreToStorage(store);
    return true;
  }
  
  return false;
}

/**
 * Get all architectures (for listing)
 */
export async function getAllArchitectures(): Promise<{id: string, architecture: Architecture}[]> {
  const store = getStoreFromStorage();
  return Object.entries(store).map(([id, architecture]) => ({
    id,
    architecture: architecture as Architecture
  }));
}

/**
 * Update specific fields of an architecture
 */
export async function updateArchitectureFields(
  architectureId: string,
  fields: Partial<Architecture>,
  editedBy: string = 'system'
): Promise<Architecture | null> {
  const architecture = await getArchitecture(architectureId);
  if (!architecture) return null;
  
  const updatedArchitecture = {
    ...architecture,
    ...fields,
    metadata: {
      ...architecture.metadata,
      ...fields.metadata,
      lastEditedAt: new Date().toISOString(),
      lastEditedBy: editedBy
    }
  };
  
  return saveArchitecture(architectureId, updatedArchitecture, editedBy);
} 