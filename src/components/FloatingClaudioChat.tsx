"use client";

import React, { useState } from 'react';
import ClaudioChat from './claudio-chat';
import { RefreshCw } from 'lucide-react';

interface FloatingClaudioChatProps {
  architectureId: string;
  onArchitectureUpdate: () => void;
}

export default function FloatingClaudioChat({ architectureId, onArchitectureUpdate }: FloatingClaudioChatProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [key, setKey] = useState(0); // Add key for forcing refresh

  const handleRefresh = () => {
    setKey(prev => prev + 1); // Force re-render of ClaudioChat
  };

  return (
    <div
      className={`floating-chat-container ${isMinimized ? 'floating-chat-minimized' : ''}`}
      style={
        isMinimized
          ? {
              position: 'fixed',
              right: 20,
              bottom: 20,
              width: 40,
              height: 40,
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              boxShadow: 'none',
              padding: 0,
            }
          : {
              position: 'fixed',
              top: 10,
              bottom: 10,
              left: 'auto',
              right: 10,
              height: 'calc(100vh - 20px)',
              maxHeight: 'calc(100vh - 20px)',
              zIndex: 1000,
              paddingTop: 0,
              paddingBottom: 0,
            }
      }
    >
      {!isMinimized && (
        <div className="floating-chat-content">
          <ClaudioChat key={key} architectureId={architectureId} onArchitectureUpdate={onArchitectureUpdate} setIsMinimized={setIsMinimized} />
        </div>
      )}
      {isMinimized && (
        <button
          onClick={() => setIsMinimized(false)}
          className="floating-chat-toggle"
          title="Maximize Chat"
          style={{ width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, background: 'rgba(0,0,0,0.08)', boxShadow: '0 1px 4px 0 rgba(0,0,0,0.08)', border: '0.1px solid #d1d5db', cursor: 'pointer' }}
        >
          <img src="/claudio-logo.png" alt="Claudio" style={{ width: 32, height: 32, objectFit: 'contain', borderRadius: '50%' }} />
        </button>
      )}
    </div>
  );
} 