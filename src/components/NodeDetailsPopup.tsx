import React, { useState, useEffect } from 'react';
import { X, Code2, Box, Terminal, AlertTriangle, Zap, DollarSign, Shield, ArrowUpRight } from 'lucide-react';
import { Node } from 'reactflow';
import Image from 'next/image';

interface NodeDetailsPopupProps {
  node: Node | null;
  onClose: () => void;
  userPrompt: string;
}

type TabType = 'overview' | 'cdk' | 'sdk' | 'terraform';

interface NodeDetails {
  summary: string;
  costEstimation: {
    monthly: {
      low: string;
      medium: string;
      high: string;
    };
    pricingNotes: string;
  };
  resilience: {
    scaling: string;
    failover: string;
  };
  cdk: {
    language: string;
    code: string;
  };
  sdk: {
    language: string;
    code: string;
  };
  terraform: {
    code: string;
  };
  security: {
    recommendations: string[];
  };
  integration: {
    connectedTo: string[];
    protocols: string[];
  };
}

export default function NodeDetailsPopup({ node, onClose, userPrompt }: NodeDetailsPopupProps) {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [showImplementationDetails, setShowImplementationDetails] = useState(false);
  const [nodeDetails, setNodeDetails] = useState<NodeDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (node) {
      if (node.data.details) {
        // Use pre-generated details
        setNodeDetails(node.data.details);
        setIsLoading(false);
      } else {
        // Fallback to fetching details if they weren't pre-generated
        fetchNodeDetails();
      }
    }
  }, [node]);

  const fetchNodeDetails = async () => {
    if (!node) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/node-details', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nodeId: node.id,
          serviceName: node.data.service,
          nodePurpose: node.data.description || node.data.label,
          userPrompt,
          connectedNodes: node.data.connectedNodes || [],
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch node details');
      }

      const data = await response.json();
      setNodeDetails(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  if (!node) return null;

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <Box className="w-4 h-4" /> },
    { id: 'cdk', label: 'CDK', icon: <Code2 className="w-4 h-4" /> },
    { id: 'sdk', label: 'SDK', icon: <Terminal className="w-4 h-4" /> },
    { id: 'terraform', label: 'Terraform', icon: <Code2 className="w-4 h-4" /> },
  ];

  return (
    <div className="node-details-container">
      <div className="backdrop-overlay" onClick={onClose} />
      <div className="node-details-popup">
        {/* Header */}
        <div className="node-details-header">
          <div className="flex items-center gap-3">
            {node.data.icon && (
              <div className="w-8 h-8 relative">
                <Image
                  src={node.data.icon}
                  alt={node.data.label}
                  width={32}
                  height={32}
                  className="object-contain"
                />
              </div>
            )}
            <div>
              <h3 className="text-lg font-medium">{node.data.label}</h3>
              <p className="text-sm text-gray-500">{node.data.service}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="node-details-close-btn"
            aria-label="Close details"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <div className="flex gap-4 px-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors
                  ${activeTab === tab.id 
                    ? 'border-blue-500 text-blue-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                `}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="node-details-body">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 text-red-600 rounded-md">
              {error}
            </div>
          ) : nodeDetails ? (
            activeTab === 'overview' ? (
              <div className="space-y-6">
                {/* Summary */}
                <div className="node-details-section">
                  <h4 className="text-sm font-medium mb-2">Summary</h4>
                  <p className="text-sm text-gray-600">
                    {nodeDetails.summary}
                  </p>
                </div>

                {/* Costs */}
                <div className="node-details-section">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-4 h-4 text-green-600" />
                    <h4 className="text-sm font-medium">Cost Estimation</h4>
                  </div>
                  <div className="bg-green-50 p-4 rounded-md space-y-2">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-gray-500">Low Usage</p>
                        <p className="text-sm font-medium">{nodeDetails.costEstimation.monthly.low}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Medium Usage</p>
                        <p className="text-sm font-medium">{nodeDetails.costEstimation.monthly.medium}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">High Usage</p>
                        <p className="text-sm font-medium">{nodeDetails.costEstimation.monthly.high}</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 pt-2 border-t border-green-100">
                      {nodeDetails.costEstimation.pricingNotes}
                    </p>
                  </div>
                </div>

                {/* Resilience */}
                <div className="node-details-section">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-4 h-4 text-blue-600" />
                    <h4 className="text-sm font-medium">Resilience & Scalability</h4>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-md space-y-3">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Scaling</p>
                      <p className="text-sm text-gray-600">{nodeDetails.resilience.scaling}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Failover</p>
                      <p className="text-sm text-gray-600">{nodeDetails.resilience.failover}</p>
                    </div>
                  </div>
                </div>

                {/* Security */}
                <div className="node-details-section">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-4 h-4 text-purple-600" />
                    <h4 className="text-sm font-medium">Security Recommendations</h4>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-md">
                    <ul className="space-y-2">
                      {nodeDetails.security.recommendations.map((rec, index) => (
                        <li key={index} className="text-sm text-gray-600 flex items-start gap-2">
                          <span className="text-purple-600">•</span>
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Integration */}
                <div className="node-details-section">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-4 h-4 text-orange-600" />
                    <h4 className="text-sm font-medium">Integration</h4>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-md">
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Connected To</p>
                        <div className="flex flex-wrap gap-2">
                          {nodeDetails.integration.connectedTo.map((node, index) => (
                            <span key={index} className="px-2 py-1 bg-white rounded text-sm text-gray-600">
                              {node}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Protocols</p>
                        <div className="flex flex-wrap gap-2">
                          {nodeDetails.integration.protocols.map((protocol, index) => (
                            <span key={index} className="px-2 py-1 bg-white rounded text-sm text-gray-600">
                              {protocol}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">
                    {activeTab === 'cdk' ? nodeDetails.cdk.language.toUpperCase() + ' CDK Implementation' :
                     activeTab === 'sdk' ? nodeDetails.sdk.language.toUpperCase() + ' SDK Implementation' :
                     'Terraform Configuration'}
                  </h4>
                  <button
                    onClick={() => setShowImplementationDetails(true)}
                    className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                  >
                    View More
                    <ArrowUpRight className="w-4 h-4" />
                  </button>
                </div>
                <pre className="bg-gray-50 p-4 rounded-md overflow-x-auto">
                  <code className={`language-${activeTab === 'cdk' ? nodeDetails.cdk.language :
                                              activeTab === 'sdk' ? nodeDetails.sdk.language :
                                              'hcl'}`}>
                    {activeTab === 'cdk' ? nodeDetails.cdk.code :
                     activeTab === 'sdk' ? nodeDetails.sdk.code :
                     nodeDetails.terraform.code}
                  </code>
                </pre>
              </div>
            )
          ) : null}
        </div>
      </div>

      {/* Implementation Details Modal */}
      {showImplementationDetails && nodeDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm" onClick={() => setShowImplementationDetails(false)} />
          <div className="relative bg-white w-full max-w-4xl max-h-[80vh] overflow-y-auto rounded-lg shadow-xl">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-medium">
                {activeTab === 'cdk' ? 'AWS CDK Implementation Details' :
                 activeTab === 'sdk' ? 'AWS SDK Implementation Details' :
                 'Terraform Configuration Details'}
              </h3>
              <button
                onClick={() => setShowImplementationDetails(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-4 space-y-6">
              {/* Usage Examples */}
              <div>
                <h4 className="text-sm font-medium mb-2">Usage Examples</h4>
                <div className="bg-gray-50 p-4 rounded-md">
                  <pre>
                    <code className={activeTab === 'cdk' ? 'language-typescript' :
                                   activeTab === 'sdk' ? 'language-python' :
                                   'language-hcl'}>
                      {activeTab === 'cdk' ? nodeDetails.cdk.code :
                       activeTab === 'sdk' ? nodeDetails.sdk.code :
                       nodeDetails.terraform.code}
                    </code>
                  </pre>
                </div>
              </div>

              {/* Best Practices */}
              <div>
                <h4 className="text-sm font-medium mb-2">Best Practices</h4>
                <div className="bg-blue-50 p-4 rounded-md">
                  <ul className="space-y-2">
                    {nodeDetails.security.recommendations.map((practice, index) => (
                      <li key={index} className="text-sm text-gray-600 flex items-start gap-2">
                        <span className="text-blue-600">•</span>
                        {practice}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Troubleshooting */}
              <div>
                <h4 className="text-sm font-medium mb-2">Troubleshooting</h4>
                <div className="bg-orange-50 p-4 rounded-md">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5" />
                    <div className="space-y-2">
                      <p className="text-sm text-gray-600">
                        Common issues and their solutions will be generated based on the service type and implementation.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 