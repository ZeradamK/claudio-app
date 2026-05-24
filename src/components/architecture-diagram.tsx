"use client";

import React, { useCallback, useState, useRef, useEffect } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  NodeTypes,
  useReactFlow,
} from 'reactflow';
import 'reactflow/dist/style.css';
import AwsServiceNode from './nodes/AwsServiceNode';
import NodeDetailsPopup from './NodeDetailsPopup';
import { Dialog, DialogContent, DialogClose, DialogTitle } from '@/components/ui/dialog';
import { Highlight } from 'prism-react-renderer';

const nodeTypes: NodeTypes = {
  awsService: AwsServiceNode,
};

interface ArchitectureDiagramProps {
  initialNodes: Node[];
  initialEdges: Edge[];
  showDetails?: boolean;
  onNodeSelect?: (node: Node | null) => void;
  selectedNode?: Node | null;
  editMode?: boolean;
  setEditMode?: (mode: boolean) => void;
  onCloudProviderChange?: (provider: any) => Promise<void>;
  userPrompt?: string;
  diagramUiState?: any;
  onDiagramUiStateChange?: (uiState: any) => void;
}

// SECTION MAPPING AND LAYOUT CONSTANTS
const SECTION_ORDER = [
  'Edge', 'Compute', 'Storage', 'Database', 'Private'
];
const SECTION_WIDTH = 220; // px per section
const SECTION_PADDING = 60; // px top/bottom padding
const NODE_HORIZONTAL_SPACING = 80; // px between nodes horizontally within section
const NODE_VERTICAL_SPACING = 80; // px between rows
const SECTION_SERVICE_MAP: Record<string, string> = {
  // Edge/Public
  'API Gateway': 'Edge', 'CloudFront': 'Edge', 'ALB': 'Edge', 'NLB': 'Edge', 'Route 53': 'Edge',
  // Compute
  'Lambda': 'Compute', 'EC2': 'Compute', 'ECS': 'Compute', 'EKS': 'Compute', 'Fargate': 'Compute',
  // Storage
  'S3': 'Storage', 'EFS': 'Storage', 'FSx': 'Storage', 'Backup': 'Storage',
  // Database
  'RDS': 'Database', 'Aurora': 'Database', 'DynamoDB': 'Database', 'ElastiCache': 'Database', 'Redshift': 'Database',
  // Security
  'IAM': 'Security', 'Cognito': 'Security', 'WAF': 'Security',
  // Private/Internal
  'SNS': 'Private', 'SQS': 'Private', 'Step Functions': 'Private', 'EventBridge': 'Private', 'AppSync': 'Private',
  'CloudWatch': 'Private', 'CodeBuild': 'Private', 'CodePipeline': 'Private',
};

// Define the order of architectural layers/roles for columns
const LAYER_ORDER = [
  'auth', 'security-group', 'application', 'compute', 'data', 'security', 'control', 'ai', 'other'
];
const LAYER_LABEL_MAP: Record<string, string> = {
  'auth': 'Authentication',
  'security-group': 'Security Group',
  'application': 'Application',
  'compute': 'Compute',
  'data': 'Data Storage',
  'security': 'Security',
  'control': 'Control',
  'ai': 'AI',
  'other': 'Other',
};

function assignSectionsAndPositions(nodes: Node[]): Node[] {
  // Group nodes by subnet and layer/role
  const grid: Record<string, Record<string, Node[]>> = { private: {}, public: {} };
  nodes.forEach(node => {
    const subnet = node.data?.subnet === 'private' ? 'private' : 'public';
    // Try to get layer/role, fallback to section, fallback to 'other'
    const layer = node.data?.layer || node.data?.role || SECTION_SERVICE_MAP[node.data?.label] || 'other';
    if (!grid[subnet][layer]) grid[subnet][layer] = [];
    grid[subnet][layer].push(node);
    node.data = { ...node.data, subnet, layer };
  });
  // Assign positions: columns = layers, rows = subnets (private=0, public=1)
  LAYER_ORDER.forEach((layer, colIdx) => {
    ['private', 'public'].forEach((subnet, rowIdx) => {
      const cellNodes = grid[subnet][layer] || [];
      cellNodes.forEach((node, nIdx) => {
        node.position = {
          x: colIdx * SECTION_WIDTH + 80 + nIdx * NODE_HORIZONTAL_SPACING,
          y: SECTION_PADDING + rowIdx * NODE_VERTICAL_SPACING + nIdx * 10 // slight offset for stacking
        };
      });
    });
  });
  // Place any nodes not in LAYER_ORDER in the last column
  nodes.forEach(node => {
    if (!LAYER_ORDER.includes(node.data.layer)) {
      const subnet = node.data.subnet;
      const colIdx = LAYER_ORDER.length;
      const rowIdx = subnet === 'private' ? 0 : 1;
      node.position = {
        x: colIdx * SECTION_WIDTH + 80,
        y: SECTION_PADDING + rowIdx * NODE_VERTICAL_SPACING
      };
    }
  });
  return nodes;
}

// Custom Cursor-like theme (fallback if vsDark import fails)
const cursorIdeTheme = {
  plain: {
    backgroundColor: '#23272e',
    color: '#e6e6e6',
    fontSize: 14,
    fontFamily: 'Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    borderRadius: 15,
    border: '0.1px solid #d1d5db', // gray-300
    padding: 18,
  },
  styles: [
    { types: ['comment'], style: { color: '#6a9955', fontStyle: 'italic' as const } },
    { types: ['string', 'inserted'], style: { color: '#ce9178' } },
    { types: ['number'], style: { color: '#b5cea8' } },
    { types: ['builtin', 'char', 'constant', 'function'], style: { color: '#dcdcaa' } },
    { types: ['punctuation', 'symbol'], style: { color: '#d4d4d4' } },
    { types: ['variable'], style: { color: '#9cdcfe' } },
    { types: ['keyword', 'tag', 'deleted'], style: { color: '#569cd6' } },
    { types: ['operator'], style: { color: '#d4d4d4' } },
    { types: ['class-name'], style: { color: '#4ec9b0' } },
    { types: ['attr-name'], style: { color: '#9cdcfe' } },
    { types: ['boolean'], style: { color: '#569cd6' } },
    { types: ['property'], style: { color: '#b5cea8' } },
    { types: ['namespace'], style: { color: '#4ec9b0' } },
  ],
};

// Add VisuallyHidden component for accessibility
const VisuallyHidden = ({ children }: { children: React.ReactNode }) => (
  <span style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 }}>{children}</span>
);

export function CodePreviewDialog({ open, onClose, code, language, onExport, isLoading = false }: { open: boolean, onClose: () => void, code: string, language: string, onExport: () => void, isLoading?: boolean }) {
  // White-themed syntax highlighting
  const whiteTheme = {
    plain: {
      backgroundColor: '#fff',
      color: '#23272e',
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
      borderRadius: 15,
      border: '0.1px solid #d1d5db',
      padding: 18,
    },
    styles: [
      { types: ['comment'], style: { color: '#6a9955', fontStyle: 'italic' as const } },
      { types: ['string', 'inserted'], style: { color: '#b56959' } },
      { types: ['number'], style: { color: '#1c00cf' } },
      { types: ['builtin', 'char', 'constant', 'function'], style: { color: '#005cc5' } },
      { types: ['punctuation', 'symbol'], style: { color: '#23272e' } },
      { types: ['variable'], style: { color: '#e36209' } },
      { types: ['keyword', 'tag', 'deleted'], style: { color: '#d73a49' } },
      { types: ['operator'], style: { color: '#23272e' } },
      { types: ['class-name'], style: { color: '#6f42c1' } },
      { types: ['attr-name'], style: { color: '#005cc5' } },
      { types: ['boolean'], style: { color: '#d73a49' } },
      { types: ['property'], style: { color: '#005cc5' } },
      { types: ['namespace'], style: { color: '#6f42c1' } },
    ],
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="max-w-2xl p-0 rounded-[15px] bg-white"
        style={{ borderRadius: 15, background: '#fff' }}
        // Prevent closing on outside click or Escape
        onPointerDownOutside={e => e.preventDefault()}
        onInteractOutside={e => e.preventDefault()}
        onEscapeKeyDown={e => e.preventDefault()}
      >
        {/* Accessibility: Visually hidden DialogTitle for screen readers */}
        <DialogTitle asChild>
          <VisuallyHidden>Export CDK Code Modal</VisuallyHidden>
        </DialogTitle>
        {/* Custom close button (top right) */}
        <DialogClose asChild>
          <button
            aria-label="Close"
            onClick={onClose}
            className="absolute right-4 top-4 rounded-full p-1 bg-gray-100 hover:bg-gray-200 transition border border-gray-300"
            style={{ zIndex: 10 }}
          >
            <span style={{ fontWeight: 700, fontSize: 18, color: '#333' }}>×</span>
          </button>
        </DialogClose>
        {/* Top indicator bar */}
        <div className="w-full px-6 pt-6 pb-2 flex items-center justify-between">
          <span className="text-xs font-bold text-blue-600">Export to your AWS Console</span>
        </div>
        {/* Code preview area */}
        <div className="px-6 pb-6">
          <div style={{ background: '#fff', borderRadius: 15, border: '0.1px solid #d1d5db', overflow: 'auto', minHeight: 180 }}>
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-[180px] w-full" style={{ color: '#23272e', fontWeight: 700, fontSize: 16 }}>
                <div className="loader mb-2" style={{ width: 32, height: 32, border: '4px solid #d1d5db', borderTop: '4px solid #2563eb', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                Generating CDK...
                <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
              </div>
            ) : (
              <Highlight theme={whiteTheme} code={code} language={language}>
                {({ className, style, tokens, getLineProps, getTokenProps }: any) => (
                  <pre className={className} style={{ ...style, margin: 0, background: 'none', fontWeight: 'bold', fontSize: 14, borderRadius: 15, padding: 18 }}>
                    {code === '// Error generating code' ? (
                      <span style={{ color: '#d73a49' }}>{code}</span>
                    ) : tokens.map((line: any, i: number) => (
                      <div key={i} {...getLineProps({ line, key: i })}>
                        {line.map((token: any, key: number) => (
                          <span key={key} {...getTokenProps({ token, key })} />
                        ))}
                      </div>
                    ))}
                  </pre>
                )}
              </Highlight>
            )}
          </div>
          <div className="flex justify-end mt-4">
            <button
              className="px-4 py-2 rounded-[10px] bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition"
              onClick={onExport}
              disabled={isLoading}
            >
              Download
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function ArchitectureDiagram({ 
  initialNodes,
  initialEdges,
  showDetails = false,
  onNodeSelect,
  selectedNode,
  editMode = false,
  setEditMode,
  onCloudProviderChange,
  userPrompt = '',
  diagramUiState,
  onDiagramUiStateChange,
}: ArchitectureDiagramProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNodeData, setSelectedNodeData] = useState<Node | null>(null);
  const reactFlowInstanceRef = useRef<any>(null);
  const reactFlow = useReactFlow ? useReactFlow() : null;

  // Apply persisted UI state on mount
  useEffect(() => {
    if (diagramUiState && reactFlowInstanceRef.current) {
      if (diagramUiState.viewport) {
        reactFlowInstanceRef.current.setViewport(diagramUiState.viewport);
      }
      // Add more as needed (e.g., selected node)
    }
  }, [diagramUiState]);

  // Track viewport changes for persistence
  const handleMoveEnd = useCallback((event: any, viewport: { x: number; y: number; zoom: number }) => {
    if (onDiagramUiStateChange) {
      onDiagramUiStateChange({
        ...diagramUiState,
        viewport,
      });
    }
  }, [onDiagramUiStateChange, diagramUiState]);

  // Track node selection for persistence
  const handleNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNodeData(node);
    if (onNodeSelect) {
      onNodeSelect(node);
    }
    if (onDiagramUiStateChange) {
      onDiagramUiStateChange({
        ...diagramUiState,
        selectedNodeId: node.id,
      });
    }
  }, [onNodeSelect, onDiagramUiStateChange, diagramUiState]);

  const handleCloseNodeDetails = useCallback(() => {
    setSelectedNodeData(null);
    if (onNodeSelect) {
      onNodeSelect(null);
    }
    if (onDiagramUiStateChange) {
      onDiagramUiStateChange({
        ...diagramUiState,
        selectedNodeId: null,
      });
    }
  }, [onNodeSelect, onDiagramUiStateChange, diagramUiState]);

  const onInit = useCallback((instance: any) => {
    reactFlowInstanceRef.current = instance;
    if (diagramUiState && diagramUiState.viewport) {
      instance.setViewport(diagramUiState.viewport);
        } else {
      instance.fitView();
    }
  }, [diagramUiState]);

  // On mount, assign sections/positions if not already set
  useEffect(() => {
    if (nodes.length > 0 && !nodes[0].data?.section) {
      setNodes(assignSectionsAndPositions([...nodes]));
    }
    // eslint-disable-next-line
  }, []);
    
    return (
    <div className="h-full w-full absolute inset-0">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onInit={onInit}
        nodeTypes={nodeTypes}
        onNodeClick={handleNodeClick}
        fitView
        onMoveEnd={handleMoveEnd}
        style={{ width: '100%', height: '100%' }}
      >
        <Controls />
      </ReactFlow>
      
      {/* Node Details Popup */}
        <NodeDetailsPopup
        node={selectedNodeData} 
        onClose={handleCloseNodeDetails}
        userPrompt={userPrompt}
      />
    </div>
  );
}

