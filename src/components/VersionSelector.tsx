import React, { useState } from 'react';
import { Select, SelectTrigger, SelectContent, SelectItem } from './ui/select';
import { Button } from './ui/button';
import { Skeleton } from './ui/skeleton';

interface Version {
  version: number;
  timestamp: string;
  metadata?: any;
}

interface VersionSelectorProps {
  versions: Version[];
  currentVersion: number;
  onRestore: (version: number) => void;
  isRestoring: boolean;
}

export default function VersionSelector({ versions, currentVersion, onRestore, isRestoring }: VersionSelectorProps) {
  const [selected, setSelected] = useState<number>(currentVersion);

  const handleSelect = (value: string) => {
    setSelected(Number(value));
  };

  const handleRestore = () => {
    if (selected !== currentVersion) {
      onRestore(selected);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <Select value={String(selected)} onValueChange={handleSelect} disabled={isRestoring}>
        <SelectTrigger className="w-[180px] h-[36px] rounded-[12px] border border-gray-300 bg-white text-black text-[14px] font-medium shadow-none focus:ring-0 focus:outline-none">
          Version: v{selected}
        </SelectTrigger>
        <SelectContent className="max-h-[200px] overflow-y-auto rounded-[12px] border border-gray-300 bg-white shadow-none">
          {versions.map((v) => (
            <SelectItem
              key={v.version}
              value={String(v.version)}
              className={`flex flex-col items-start px-3 py-2 text-[13px] ${v.version === currentVersion ? 'bg-blue-50 font-bold text-blue-700' : 'text-gray-800'}`}
            >
              <span>v{v.version} — {new Date(v.timestamp).toLocaleString([], { year: '2-digit', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
              {v.metadata?.changes && (
                <span className="text-xs text-gray-500 truncate max-w-[150px]">{v.metadata.changes}</span>
              )}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        onClick={handleRestore}
        disabled={isRestoring || selected === currentVersion}
        className="h-[36px] rounded-[12px] px-4 text-[14px] font-bold bg-blue-600 text-white disabled:bg-gray-300 disabled:text-gray-500"
      >
        {isRestoring ? <Skeleton className="w-5 h-5 rounded-full animate-pulse bg-blue-200" /> : 'Restore'}
      </Button>
    </div>
  );
} 