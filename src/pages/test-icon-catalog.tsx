import { AWS_ICON_CATALOG, getCategories } from '@/utils/awsIconCatalog';
import { useState } from 'react';

export default function TestIconCatalog() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const categories = ['all', ...getCategories()];
  
  const filteredIcons = Object.entries(AWS_ICON_CATALOG).filter(([id, entry]) => {
    return selectedCategory === 'all' || entry.category === selectedCategory;
  });

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">AWS Icon Catalog Test</h1>
        
        {/* Category Filter */}
        <div className="mb-8">
          <label className="block text-sm font-medium mb-2">Filter by Category:</label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)} ({cat === 'all' ? filteredIcons.length : 
                  Object.values(AWS_ICON_CATALOG).filter(e => e.category === cat).length})
              </option>
            ))}
          </select>
        </div>

        {/* Icon Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {filteredIcons.map(([id, entry]) => (
            <div
              key={id}
              className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow"
            >
              {/* Icon Display */}
              <div className="flex justify-center mb-4 h-16">
                <img
                  src={entry.path}
                  alt={entry.serviceName}
                  className="h-full w-auto"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = '/icons/aws-icons/aws-generic.svg';
                    target.onerror = null;
                  }}
                />
              </div>
              
              {/* Service Info */}
              <div className="text-center">
                <h3 className="font-semibold text-sm mb-1">{entry.serviceName}</h3>
                <p className="text-xs text-gray-500 mb-2">{entry.category}</p>
                
                {/* ID */}
                <div className="text-xs bg-gray-100 rounded px-2 py-1 mb-2 font-mono">
                  ID: {id}
                </div>
                
                {/* Aliases */}
                <div className="text-xs text-gray-600">
                  <span className="font-medium">Aliases:</span>
                  <div className="mt-1 space-y-1">
                    {entry.aliases.slice(0, 3).map((alias, idx) => (
                      <div key={idx} className="bg-blue-50 rounded px-1 py-0.5">
                        {alias}
                      </div>
                    ))}
                    {entry.aliases.length > 3 && (
                      <div className="text-gray-400">+{entry.aliases.length - 3} more</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="mt-12 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Catalog Statistics</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {Object.keys(AWS_ICON_CATALOG).length}
              </div>
              <div className="text-sm text-gray-600">Total Icons</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {getCategories().length}
              </div>
              <div className="text-sm text-gray-600">Categories</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">
                {Object.values(AWS_ICON_CATALOG).reduce((sum, entry) => sum + entry.aliases.length, 0)}
              </div>
              <div className="text-sm text-gray-600">Total Aliases</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600">
                {Object.values(AWS_ICON_CATALOG).reduce((sum, entry) => sum + entry.keywords.length, 0)}
              </div>
              <div className="text-sm text-gray-600">Total Keywords</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 