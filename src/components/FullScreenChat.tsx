"use client";

import React, { useState } from 'react';
import { X } from 'lucide-react';

interface FullScreenChatProps {
  isOpen: boolean;
  onClose: () => void;
  architectureId?: string;
}

export default function FullScreenChat({ isOpen, onClose, architectureId }: FullScreenChatProps) {
  const [message, setMessage] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
        <h2 className="text-xl font-semibold">Jarvis Chat</h2>
        <button
          onClick={onClose}
          className="rounded-lg p-2 hover:bg-gray-100"
          aria-label="Close chat"
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      {/* Chat Container */}
      <div className="flex h-[calc(100vh-8rem)] flex-col">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Chat messages will go here */}
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 p-6">
          <div className="flex gap-4">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ask Jarvis anything about your architecture..."
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
            />
            <button
              className="rounded-lg bg-blue-500 px-6 py-2 text-white hover:bg-blue-600"
              onClick={() => {
                // Handle send message
              }}
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 