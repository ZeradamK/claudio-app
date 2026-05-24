import { NextRequest, NextResponse } from 'next/server';
import { getArchitecture, saveArchitecture } from '@/store/architecture-store';

export async function POST(request: NextRequest) {
  try {
    const { architectureId, nodeId } = await request.json();
    
    if (!architectureId) {
      return NextResponse.json(
        { error: 'Architecture ID is required' },
        { status: 400 }
      );
    }
    
    // Get the architecture data
    const architecture = await getArchitecture(architectureId);
    
    if (!architecture) {
      return NextResponse.json(
        { error: 'Architecture not found' },
        { status: 404 }
      );
    }
    
    // If we have a specific node, we'll optimize the layout around that node
    let focusNodeId = nodeId;
    
    // Create a copy of the nodes and edges
    const nodes = [...architecture.nodes];
    const edges = [...architecture.edges];
    
    // Restructure the architecture
    const restructuredLayout = await restructureArchitecture(nodes, edges, focusNodeId);
    
    // Save the updated architecture
    await saveArchitecture(architectureId, {
      ...architecture,
      nodes: restructuredLayout.nodes,
      edges: restructuredLayout.edges
    });
    
    return NextResponse.json({
      success: true,
      nodes: restructuredLayout.nodes,
      edges: restructuredLayout.edges
    });
  } catch (error) {
    console.error('Error restructuring architecture:', error);
    return NextResponse.json(
      { error: 'Failed to restructure architecture' },
      { status: 500 }
    );
  }
}

// Restructure via deterministic algorithm. Phase 5 may add AI-driven
// restructuring via a Claude tool call, but for now algorithmic is enough.
async function restructureArchitecture(nodes: any[], edges: any[], focusNodeId?: string) {
  return algorithmicRestructure(nodes, edges, focusNodeId);
}

// Simple algorithmic restructuring function
function algorithmicRestructure(nodes: any[], edges: any[], focusNodeId?: string) {
  // Create a graph representation of the architecture
  const graph: Record<string, string[]> = {};
  
  // Initialize graph with all nodes
  nodes.forEach(node => {
    graph[node.id] = [];
  });
  
  // Add edges to the graph
  edges.forEach(edge => {
    if (graph[edge.source]) {
      graph[edge.source].push(edge.target);
    }
    if (graph[edge.target]) {
      graph[edge.target].push(edge.source);
    }
  });
  
  // Determine the starting node (either the focus node or a node with the most connections)
  let startNodeId = focusNodeId;
  
  if (!startNodeId || !graph[startNodeId]) {
    // Find the node with the most connections
    let maxConnections = 0;
    
    for (const nodeId in graph) {
      if (graph[nodeId].length > maxConnections) {
        maxConnections = graph[nodeId].length;
        startNodeId = nodeId;
      }
    }
  }
  
  // BFS to get the order of nodes from the start node
  const visited = new Set<string>();
  const queue: string[] = [];
  const nodeOrder: string[] = [];
  
  if (startNodeId) {
    queue.push(startNodeId);
    visited.add(startNodeId);
  }
  
  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    nodeOrder.push(nodeId);
    
    // Visit all neighbors
    const neighbors = graph[nodeId] || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }
  }
  
  // Add any remaining nodes that weren't visited
  nodes.forEach(node => {
    if (!visited.has(node.id)) {
      nodeOrder.push(node.id);
    }
  });
  
  // Now arrange nodes in a grid or layered layout
  const updatedNodes = [...nodes];
  
  // Use a structured layout - we'll try a layered approach
  const layerSize = Math.ceil(Math.sqrt(nodes.length));
  const spacing = 250; // Space between nodes
  
  nodeOrder.forEach((nodeId, index) => {
    const node = updatedNodes.find(n => n.id === nodeId);
    if (node) {
      const layer = Math.floor(index / layerSize);
      const position = index % layerSize;
      
      // Staggered layout for better visibility
      const xOffset = layer % 2 === 0 ? 0 : spacing / 2;
      
      node.position = {
        x: xOffset + position * spacing,
        y: layer * spacing
      };
    }
  });
  
  return {
    nodes: updatedNodes,
    edges: edges
  };
} 