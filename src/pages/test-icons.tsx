import React, { useEffect, useState } from 'react';
import ArchitectureDiagram from '@/components/architecture-diagram';
import { ReactFlowProvider } from 'reactflow';

export default function TestIcons() {
  const [architectureData, setArchitectureData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadTestArchitecture() {
      try {
        const response = await fetch('/api/architecture/aws', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            components: [
              'CloudFront',
              'Route 53',
              'API Gateway',
              'Lambda',
              'DynamoDB',
              'S3',
              'IAM',
              'CloudWatch'
            ]
          })
        });
        if (!response.ok) {
          throw new Error('Failed to load test architecture');
        }
        const data = await response.json();
        setArchitectureData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    loadTestArchitecture();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading test architecture...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-red-600">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full">
      <div className="p-4 bg-gray-100 border-b">
        <h1 className="text-2xl font-bold">AWS Icons Test</h1>
        <p className="text-gray-600">Testing AWS icon integration with architecture diagram</p>
      </div>
      
      <div className="h-full">
        <ReactFlowProvider>
          <ArchitectureDiagram
            initialNodes={architectureData?.nodes || []}
            initialEdges={architectureData?.edges || []}
            showDetails={true}
          />
        </ReactFlowProvider>
      </div>
    </div>
  );
} 