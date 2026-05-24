import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import Image from 'next/image';

interface AwsServiceData {
  label: string;
  service: string;
  icon: string;
  layer: string;
  description?: string;
  costs?: {
    onDemand?: string;
    reserved?: string;
    savings?: string;
  };
  resiliency?: {
    availability?: string;
    recovery?: string;
    backups?: string;
  };
  scalability?: {
    auto?: string;
    limits?: string;
    recommendations?: string;
  };
  configuration?: any;
  inputConnections?: number;
  outputConnections?: number;
}

export default function AwsServiceNode({ data, selected }: NodeProps<AwsServiceData>) {
  return (
    <div 
      className={`
        relative px-4 py-3 shadow-md rounded-md bg-white border-2 
        transition-all duration-200 ease-in-out
        hover:shadow-lg hover:-translate-y-0.5
        ${selected ? 'border-blue-500 shadow-blue-100' : 'border-gray-200'}
      `}
    >
      <Handle 
        type="target" 
        position={Position.Left} 
        className={`w-3 h-3 transition-all duration-200 ${selected ? 'bg-blue-500' : ''}`} 
      />
      
      <div className="flex items-center">
        {data.icon && (
          <div className={`
            mr-3 p-2 rounded-lg transition-all duration-200
            ${selected ? 'bg-blue-50' : 'bg-gray-50'}
          `}>
            <Image
              src={data.icon}
              alt={data.label}
              width={32}
              height={32}
              className="object-contain"
            />
          </div>
        )}
        <div className="flex flex-col">
          <div className={`
            text-sm font-bold transition-colors duration-200
            ${selected ? 'text-blue-600' : 'text-gray-800'}
          `}>
            {data.label}
          </div>
          <div className="text-xs text-gray-500">{data.layer}</div>
        </div>
      </div>

      <Handle 
        type="source" 
        position={Position.Right} 
        className={`w-3 h-3 transition-all duration-200 ${selected ? 'bg-blue-500' : ''}`} 
      />

      {/* Click indicator */}
      {selected && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full animate-ping" />
      )}
    </div>
  );
} 