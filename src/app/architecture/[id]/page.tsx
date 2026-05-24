// src/app/architecture/[id]/page.tsx
"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ArchitectureDiagram, { CodePreviewDialog } from '@/components/architecture-diagram';
import FloatingClaudioChat from '@/components/FloatingClaudioChat';
import type { Node, Edge } from 'reactflow';
import { Button } from '@/components/ui/button';
import { Menu, X, Download, FileJson, Sparkles, Trash2, Home, Layers, Database, Code, Settings, RefreshCw } from 'lucide-react';
import { ReactFlowProvider } from 'reactflow';
import dynamic from 'next/dynamic';
import LanguageSelectModal from '@/components/language-select-modal';
// SVG assets in /public are served directly at runtime — no import needed.
const awsIcon = '/icons/aws-icons/aws-generic.svg';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import VersionSelector from '@/components/VersionSelector';
import { DriftPanel } from '@/components/cloud/DriftPanel';
// import { useToast } from "@/hooks/use-toast"; // For error feedback
// import { Skeleton } from "@/components/ui/skeleton"; // For loading state

// Use dynamic import with no SSR for Monaco Editor
const CdkEditor = dynamic(() => import('@/components/cdk-editor'), {
  ssr: false,
});

// CDK Regenerating Overlay Component
const RegeneratingOverlay = ({ isVisible }: { isVisible: boolean }) => {
  if (!isVisible) return null;
  
  return (
    <div className="regenerating-overlay">
      <div className="prism-container">
        <div className="prism-animation">
          <div className="prism">
            <div className="face face-1"></div>
            <div className="face face-2"></div>
            <div className="face face-3"></div>
            <div className="face face-4"></div>
          </div>
        </div>
        <p className="text-black font-medium mt-6 text-center">Regenerating CDK Code<span className="dot-animation"></span></p>
      </div>
    </div>
  );
};

// Architecture Regenerating Overlay Component
const ArchitectureRegeneratingOverlay = ({ isVisible }: { isVisible: boolean }) => {
  if (!isVisible) return null;
  
  return (
    <div className="architecture-regenerating-overlay">
      <div className="prism-container">
        <div className="prism-animation">
          <div className="prism">
            <div className="face face-1"></div>
            <div className="face face-2"></div>
            <div className="face face-3"></div>
            <div className="face face-4"></div>
            
          </div>
        </div>
        <p className="text-black font-medium mt-6 text-center">Redesigning Architecture<span className="dot-animation"></span></p>
      </div>
    </div>
  );
};

// Add CloudProvider type
type CloudProvider = 'aws' | 'azure' | 'gcp';

interface ArchitectureData {
    nodes: Node[];
    edges: Edge[];
    metadata?: {
        prompt?: string;
        rationale?: string;
        cdkCode?: string;
        cdkLanguage?: string;
        cloudProvider?: CloudProvider;
        generatedBy?: string;
        [key: string]: any;
    };
    versions?: any[];
    currentVersion?: number;
}

// Custom syntax highlighter theme based on default theme
const customSyntaxTheme = {
  'pre[class*="language-"]': {
    background: '#ffffff',
    fontSize: '14px',
    lineHeight: '1.5',
    padding: '1em',
    margin: '0',
    overflow: 'auto',
    borderRadius: '0',
  },
  'code[class*="language-"]': {
    fontFamily: 'Monaco, Consolas, "Andale Mono", "Ubuntu Mono", monospace',
    background: '#ffffff',
  },
};

export default function ArchitecturePage() {
  const params = useParams();
  const id = params?.id ? String(params.id) : undefined;
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [architectureData, setArchitectureData] = useState<ArchitectureData | null>(null);
  const [activeTab, setActiveTab] = useState('diagram');
  const [menuOpen, setMenuOpen] = useState(false);
  const touchStartXRef = useRef<number>(0);
  const [languageSelectOpen, setLanguageSelectOpen] = useState(false);
  const [cdkLanguage, setCdkLanguage] = useState('typescript');
  const [isGeneratingCdk, setIsGeneratingCdk] = useState(false);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [cloudProvider, setCloudProvider] = useState<CloudProvider>('aws');
  const [isCloudTransitioning, setIsCloudTransitioning] = useState(false);
  const [isRegeneratingArchitecture, setIsRegeneratingArchitecture] = useState(false);
  const [diagramUiState, setDiagramUiState] = useState<any>(null);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const exportButtonRef = useRef<HTMLDivElement>(null);
  // const { toast } = useToast();
  // State for code preview modal
  const [codePreviewOpen, setCodePreviewOpen] = useState(false);
  const [previewCode, setPreviewCode] = useState('');
  const [previewLanguage, setPreviewLanguage] = useState('typescript');
  const [isRestoringVersion, setIsRestoringVersion] = useState(false);

  // Restore UI state on mount
  useEffect(() => {
    if (id) {
      const saved = localStorage.getItem(`architecture-ui-${id}`);
      if (saved) {
        setDiagramUiState(JSON.parse(saved));
      }
    }
  }, [id]);

  // Persist UI state on change
  useEffect(() => {
    if (id && diagramUiState) {
      localStorage.setItem(`architecture-ui-${id}` , JSON.stringify(diagramUiState));
    }
  }, [id, diagramUiState]);

  // Clear UI state on unmount (navigation away)
  useEffect(() => {
    return () => {
      if (id) {
        localStorage.removeItem(`architecture-ui-${id}`);
      }
    };
  }, [id]);

  // Handler to update UI state (to be passed to ArchitectureDiagram)
  const handleDiagramUiStateChange = (uiState: any) => {
    setDiagramUiState(uiState);
  };

  // Handle cloud provider change
  const handleCloudProviderChange = async (provider: CloudProvider) => {
    if (!id || provider === cloudProvider) return;
    
    setIsCloudTransitioning(true);
    
    try {
      // Call API to update the architecture with the new cloud provider
      const response = await fetch('/api/update-cloud-provider', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          architectureId: id,
          cloudProvider: provider
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update cloud provider');
      }
      
      // Set the new cloud provider
      setCloudProvider(provider);
      
      // Refresh architecture data
      await refreshArchitecture();
      
    } catch (error: any) {
      console.error('Error updating cloud provider:', error);
      alert(`Error updating cloud provider: ${error.message}`);
    } finally {
      // End transition after a short delay to show the animation
      setTimeout(() => {
        setIsCloudTransitioning(false);
      }, 500);
    }
  };

  useEffect(() => {
    if (!id) {
        setError("No architecture ID provided.");
        setIsLoading(false);
        return;
    };

    const fetchArchitecture = async () => {
      setIsLoading(true);
      setError(null);
      setArchitectureData(null); // Clear previous data
      console.log(`Fetching architecture for ID: ${id}`);

      try {
        const response = await fetch(`/api/architecture/${id}`);
        
        if (!response.ok) {
            throw new Error(`Error fetching architecture: ${response.status}`);
        }
        
        const data = await response.json();
        setArchitectureData(data);
        
        // Set cloud provider from metadata if available
        if (data.metadata?.cloudProvider) {
          setCloudProvider(data.metadata.cloudProvider as CloudProvider);
        }
      } catch (error) {
        console.error("Error fetching architecture:", error);
        setError(error instanceof Error ? error.message : String(error));
      } finally {
        setIsLoading(false);
      }
    };

    fetchArchitecture();
  }, [id]); // Re-run effect if the ID changes

  const handleGenerateCdk = async () => {
    if (!id) return;
    setLanguageSelectOpen(true);
  };

  const handleCdkLanguageSelect = async (language: string) => {
    if (!id) return;
    setLanguageSelectOpen(false);
    setCdkLanguage(language);
    
    setIsGeneratingCdk(true);
    
    // Track start time to ensure minimum display duration
    const startTime = Date.now();

    try {
      const response = await fetch('/api/generate-cdk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          architectureId: id,
          language 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate CDK');
      }

      const data = await response.json();
      
      // Refresh architecture data to get updated CDK code
      const refreshResponse = await fetch(`/api/architecture/${id}`);
      if (refreshResponse.ok) {
        const refreshedData = await refreshResponse.json();
        setArchitectureData(refreshedData);
        
        // Ensure animation shows for at least 1.5 seconds
        const elapsedTime = Date.now() - startTime;
        const minDisplayTime = 1500; // 1.5 seconds
        
        if (elapsedTime < minDisplayTime) {
          await new Promise(resolve => setTimeout(resolve, minDisplayTime - elapsedTime));
        }
        
        // Switch to CDK tab
        setActiveTab('cdk');
      }
    } catch (error: any) {
      console.error('Error generating CDK:', error);
      alert(`Error generating CDK: ${error.message}`);
    } finally {
      setIsGeneratingCdk(false);
    }
  };

  const handleSaveCdkChanges = async (newCode: string) => {
    if (!id) return;

    const response = await fetch('/api/save-cdk', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        architectureId: id,
        cdkCode: newCode,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to save CDK changes');
    }

    // Refresh architecture data
    await refreshArchitecture();
  };

  const handleCdkLanguageChange = (language: string) => {
    if (language === cdkLanguage) return;
    
    // Directly change the language without confirmation
      setCdkLanguage(language);
      handleCdkLanguageSelect(language);
  };

  const handleDownloadCdk = () => {
    if (id) {
      window.open(`/api/download-cdk/${id}`, '_blank');
    }
  };

  const refreshArchitecture = async () => {
    if (!id) return;
    
    try {
      const response = await fetch(`/api/architecture/${id}`);
      
      if (!response.ok) {
        throw new Error('Failed to refresh architecture data');
      }
      
      const refreshedData = await response.json();
      setArchitectureData(refreshedData);
    } catch (error) {
      console.error('Error refreshing architecture:', error);
    }
  };

  // Handler for architecture updates from Claudio
  const handleArchitectureUpdate = () => {
    // Refresh the architecture data
    fetchArchitectureData();
  };

  // Function to fetch architecture data
  const fetchArchitectureData = async () => {
    if (!id) return;
    
    try {
      setIsLoading(true);
      const response = await fetch(`/api/architecture/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch architecture');
      }
      const data = await response.json();
      setArchitectureData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load architecture');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle tab change from side navigation
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (exportButtonRef.current && !exportButtonRef.current.contains(event.target as HTMLElement)) {
        setExportDropdownOpen(false);
      }
    }
    if (exportDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [exportDropdownOpen]);

  // Handler for CDK export language selection
  const handleExportCDK = async (language: string) => {
    setPreviewLanguage(language);
    setCodePreviewOpen(true);
    setIsGeneratingCdk(true);
    setPreviewCode("");

    try {
      if (!id) throw new Error("No architecture ID");
      const response = await fetch('/api/export-cdk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          architectureId: id,
          language,
        }),
      });
      if (response.ok) {
        const data = await response.json();
        setPreviewCode(data.cdkCode || '// No code returned');
      } else {
        setPreviewCode('// Error generating code');
      }
    } catch (err) {
      setPreviewCode('// Error generating code');
    }
    setIsGeneratingCdk(false);
  };

  // Restore version handler
  const handleRestoreVersion = async (version: number) => {
    if (!id) return;
    setIsRestoringVersion(true);
    try {
      const response = await fetch('/api/restore-version', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ architectureId: id, version }),
      });
      if (!response.ok) throw new Error('Failed to restore version');
      // Refetch architecture data
      await refreshArchitecture();
    } catch (err) {
      alert('Error restoring version');
    } finally {
      setIsRestoringVersion(false);
    }
  };

  const renderContent = () => {
    if (isLoading) {
        return (
          <div className="w-full h-full flex items-center justify-center bg-white">
            <img
              src="/claudio-logo.png"
              alt="Claudio Logo"
              width={30}
              height={30}
              className="claudio-breathing-logo"
              style={{ width: 30, height: 30 }}
            />
            <style jsx global>{`
              .claudio-breathing-logo {
                animation: claudio-breath 1.8s ease-in-out infinite;
                display: block;
                margin: 0 auto;
                will-change: transform;
              }
              @keyframes claudio-breath {
                0% { transform: scale(1); }
                40% { transform: scale(1.13); }
                60% { transform: scale(0.97); }
                100% { transform: scale(1); }
              }
            `}</style>
          </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 text-center text-red-600">Error: {error}</div>
        );
    }

    if (!architectureData) {
       return <div className="p-4 text-center text-black">No architecture data found.</div>;
    }

    return (
      <div className="w-full h-full flex flex-col relative">
        {/* Content container - adjusted to take full height */}
        <div className="flex-grow flex flex-col overflow-hidden" style={{ height: 'calc(100vh - 15px)' }}>
          {/* Full screen diagram */}
          <div className="h-full w-full relative overflow-hidden">
            {/* Version Selector overlaying ReactFlow */}
            {architectureData?.versions && architectureData?.currentVersion && (
              <div className="absolute z-50" style={{ top: 15, right: 40 }}>
                <VersionSelector
                  versions={architectureData.versions}
                  currentVersion={architectureData.currentVersion}
                  onRestore={handleRestoreVersion}
                  isRestoring={isRestoringVersion}
                />
              </div>
            )}
            <div style={{ height: '100%', width: '100%' }}>
              <ReactFlowProvider>
                <div style={{ width: '100%', height: '100%' }}>
                  <ArchitectureDiagram
                    initialNodes={architectureData.nodes ?? []}
                    initialEdges={architectureData.edges ?? []}
                    onNodeSelect={setSelectedNode}
                    selectedNode={selectedNode}
                    editMode={editMode}
                    setEditMode={setEditMode}
                    showDetails={false}
                    onCloudProviderChange={handleCloudProviderChange}
                    diagramUiState={diagramUiState}
                    onDiagramUiStateChange={handleDiagramUiStateChange}
                  />
                </div>
              </ReactFlowProvider>
            </div>
            {/* Architecture regeneration overlay */}
            <ArchitectureRegeneratingOverlay isVisible={isRegeneratingArchitecture} />

            {/* Floating Claudio Chat */}
            {id && <FloatingClaudioChat architectureId={id} onArchitectureUpdate={handleArchitectureUpdate} />}
          </div>
        </div>

        {/* Footer - 15px height with centered text */}
        <footer className="h-[15px] w-full flex items-center justify-center">
          <span className="text-[10px] text-gray-500">
            Claudio @2025
          </span>
        </footer>
      </div>
    );
   };

  return (
    <div className="flex h-screen bg-white relative">
      {/* Container with border radius, border, and margin */}
      <div className="w-full h-full m-[10px] p-[10px] bg-white rounded-[20px] border border-gray-200 flex flex-col" style={{ borderWidth: '0.1px', boxSizing: 'border-box' }}>
        <main className="flex-1 flex flex-col overflow-hidden">
          {renderContent()}
          {/* Language Selection Modal */}
          <LanguageSelectModal
            isOpen={languageSelectOpen}
            onClose={() => setLanguageSelectOpen(false)}
            onSelect={handleCdkLanguageSelect}
          />
          {/* Code Preview Dialog */}
          <CodePreviewDialog
            open={codePreviewOpen}
            onClose={() => setCodePreviewOpen(false)}
            code={previewCode}
            language={previewLanguage}
            isLoading={isGeneratingCdk}
            onExport={() => setCodePreviewOpen(false)}
          />
        </main>
      </div>
      {/* Export Tab Button - Top Left */}
      <div className="absolute z-30" style={{ top: 30, left: 30, margin: 0, position: 'absolute' }}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="w-[100px] h-[30px] rounded-[15px] text-[14px] font-bold flex items-center justify-center bg-white border border-gray-400 shadow-none hover:bg-gray-100 transition text-black focus:border-gray-400 focus:border-[0.1px] focus:ring-0 focus:outline-none"
              style={{ borderWidth: '0.1px' }}
            >
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="bottom" className="w-[100px] rounded-[15px] py-2 border border-gray-400 bg-white shadow-none focus:border-gray-400 focus:border-[0.1px] focus:ring-0 focus:outline-none" style={{ borderWidth: '0.1px' }}>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="flex items-center justify-between text-[13px] font-bold rounded-[15px] transition-colors duration-200 ease-in-out hover:bg-gray-300 min-h-[30px] px-2 text-black bg-white border-0 cursor-pointer">
                <span>CDK</span>
                <img src="/aws-icon.png" alt="AWS" style={{ height: 15, width: 15, marginLeft: 8 }} />
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-[120px] rounded-[15px] py-2 border border-gray-400 bg-white shadow-none" style={{ marginLeft: 15 }}>
                <DropdownMenuItem onClick={() => handleExportCDK('python')}>Python</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExportCDK('typescript')}>TypeScript</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExportCDK('javascript')}>JavaScript</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExportCDK('java')}>Java</DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuItem
              className="flex items-center justify-between text-[13px] font-bold rounded-[15px] transition-colors duration-200 ease-in-out hover:bg-gray-300 min-h-[30px] px-2 text-black bg-white border-0 cursor-pointer"
              style={{ minHeight: 30, paddingLeft: 8, paddingRight: 8 }}
              // onClick={handleExportTerraform}
            >
              <span>Terraform</span>
              <img src="/aws-icon.png" alt="AWS" style={{ height: 15, width: 15, marginLeft: 8 }} />
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {/* Cloud Drift panel — Phase 6 */}
      {id && <DriftPanel architectureId={id} />}
    </div>
  );
}

// Original function remains unchanged
function markdownToHtml(markdown: string): string {
  return markdown
      // Convert headers
      .replace(/## (.*)/g, '<h2>$1</h2>')
      .replace(/### (.*)/g, '<h3>$1</h3>')
      .replace(/#### (.*)/g, '<h4>$1</h4>')
      // Convert lists
      .replace(/\n- (.*)/g, '\n<li>$1</li>')
      .replace(/(<li>.*<\/li>\n)+/g, '<ul>$&</ul>')
      // Convert paragraphs
      .replace(/([^\n]+)\n\n/g, '<p>$1</p>')
      // Convert code blocks
      .replace(/```([^`]+)```/g, '<pre><code>$1</code></pre>')
      // Convert inline code
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      // Convert emphasis
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      // Convert line breaks
      .replace(/\n/g, '<br>');
}

function enhancedMarkdownToHtml(markdown: string): string {
  // First, convert special AWS service patterns to temporary placeholders to preserve them
  const awsServicePlaceholders: {[key: string]: string} = {};
  let placeholderIndex = 0;
  
  // Pre-process: Find AWS service patterns and convert to placeholders
  const awsServiceRegex = /\*\*(AWS|Amazon|Lambda|S3|EC2|ECS|EKS|DynamoDB|RDS|CloudFront|API Gateway|VPC|IAM|SNS|SQS|ELB|ALB|NLB|CloudWatch|CloudTrail|Route 53|Aurora|ElastiCache|Kinesis|Fargate|EFS|CodePipeline|CodeBuild|CodeDeploy|CloudFormation|Step Functions|AppSync|Cognito|WAF|[A-Za-z0-9\s]+)\*\*\s*:/g;
  
  const preprocessedMarkdown = markdown.replace(awsServiceRegex, (match) => {
    // Extract service name without asterisks
    let serviceName = match.replace(/\*\*/g, '').replace(/:$/, '').trim();
    const placeholder = `__AWS_SERVICE_${placeholderIndex}__`;
    awsServicePlaceholders[placeholder] = serviceName;
    placeholderIndex++;
    return placeholder + ':';
  });
  
  // Process the markdown with the original converter
  let html = markdownToHtml(preprocessedMarkdown);
  
  // Post-process: Replace placeholders with styled service badges
  Object.keys(awsServicePlaceholders).forEach(placeholder => {
    const serviceName = awsServicePlaceholders[placeholder];
    
    // Choose color for badge based on service type
    let color = 'blue';
    let iconPath = '';
    
    // Determine color based on service category
    if (/S3|EFS|Storage|Backup/.test(serviceName)) {
      color = 'green';
      iconPath = '<path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />';
    } else if (/EC2|Lambda|ECS|EKS|Compute|Fargate/.test(serviceName)) {
      color = 'orange';
      iconPath = '<path d="M5.5 9.75a2.5 2.5 0 10-5 0 2.5 2.5 0 005 0zM11 9.75a2.5 2.5 0 10-5 0 2.5 2.5 0 005 0zM14.25 12a.75.75 0 01.75-.75h4a.75.75 0 01.75.75v4a.75.75 0 01-.75.75h-4a.75.75 0 01-.75-.75v-4zM3.5 16.75a.75.75 0 01-.75-.75v-4a.75.75 0 01.75-.75h4a.75.75 0 01.75.75v4a.75.75 0 01-.75.75h-4zM9 16.75a.75.75 0 01-.75-.75v-4a.75.75 0 01.75-.75h4a.75.75 0 01.75.75v4a.75.75 0 01-.75.75h-4zM3.5 10.75a.75.75 0 01-.75-.75V6a.75.75 0 01.75-.75h4a.75.75 0 01.75.75v4a.75.75 0 01-.75.75h-4z" />';
    } else if (/DynamoDB|RDS|Aurora|Database|ElastiCache/.test(serviceName)) {
      color = 'purple';
      iconPath = '<path d="M3 12v3c0 1.657 3.134 3 7 3s7-1.343 7-3v-3c0 1.657-3.134 3-7 3s-7-1.343-7-3z" /><path d="M3 7v3c0 1.657 3.134 3 7 3s7-1.343 7-3V7c0 1.657-3.134 3-7 3S3 8.657 3 7z" /><path d="M17 5c0 1.657-3.134 3-7 3S3 6.657 3 5s3.134-3 7-3 7 1.343 7 3z" />';
    } else if (/API Gateway|Route 53|Networking|VPC|ALB|NLB|ELB/.test(serviceName)) {
      color = 'indigo';
      iconPath = '<path d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />';
    } else if (/SNS|SQS|Kinesis|Messaging/.test(serviceName)) {
      color = 'yellow';
      iconPath = '<path fill-rule="evenodd" d="M10 2a4 4 0 00-4 4v1H5a1 1 0 00-.994.89l-1 9A1 1 0 004 18h12a1 1 0 00.994-1.11l-1-9A1 1 0 0015 7h-1V6a4 4 0 00-4-4zm2 5V6a2 2 0 10-4 0v1h4zm-6 3a1 1 0 112 0 1 1 0 01-2 0zm7-1a1 1 0 100 2 1 1 0 000-2z" clip-rule="evenodd" />';
    } else if (/CloudWatch|CloudTrail|Monitoring|Logging/.test(serviceName)) {
      color = 'teal';
      iconPath = '<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd" />';
    } else if (/IAM|Cognito|Security|Authentication|WAF/.test(serviceName)) {
      color = 'red';
      iconPath = '<path fill-rule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />';
    } else if (/CloudFormation|CodePipeline|CodeBuild|CodeDeploy|DevOps/.test(serviceName)) {
      color = 'gray';
      iconPath = '<path fill-rule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clip-rule="evenodd" />';
    }
    
    // Create a badge with the service name
    const badge = `<div class="inline-flex items-center bg-${color}-50 text-${color}-800 rounded-lg px-3 py-1.5 my-1 mr-2">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 text-${color}-600" viewBox="0 0 20 20" fill="currentColor">
        ${iconPath}
      </svg>
      <span class="font-medium">${serviceName}</span>:
    </div>`;

    html = html.replace(placeholder + ':', badge);
  });
  
  // Enhance main section headings
  html = html.replace(/<h2>(.*?)<\/h2>/g, (match: string, title: string) => {
    return `<h2 class="text-xl font-semibold text-gray-800 mt-8 mb-4 pb-2 border-b border-gray-200">
      <div class="flex items-center">
        <span class="inline-block w-1.5 h-5 bg-blue-500 rounded-full mr-2"></span>
        ${title}
      </div>
    </h2>`;
  });
  return html;
}