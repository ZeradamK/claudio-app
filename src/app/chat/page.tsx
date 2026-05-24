"use client";

import { useRouter, useSearchParams } from 'next/navigation';
import FloatingClaudioChat from '@/components/FloatingClaudioChat';
import { useState, useEffect, Suspense } from 'react';

function ChatPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Try to get architectureId from query params, or fallback to localStorage or a default
  const [architectureId, setArchitectureId] = useState<string | null>(null);

  useEffect(() => {
    const idFromQuery = searchParams?.get('architectureId');
    if (idFromQuery) {
      setArchitectureId(idFromQuery);
    } else {
      // Try to get last used architectureId from localStorage
      const lastId = localStorage.getItem('last-architecture-id');
      if (lastId) setArchitectureId(lastId);
    }
  }, [searchParams]);

  // Dummy handler for architecture update (can be improved to refresh diagram if needed)
  const handleArchitectureUpdate = () => {
    // Optionally, you could route back to the diagram or refresh state
  };

  if (!architectureId) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full p-8">
        <h2 className="text-xl font-semibold mb-4">No architecture selected</h2>
        <p className="text-gray-600">Please select or create an architecture to chat with Claudio.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-full bg-white">
      <FloatingClaudioChat architectureId={architectureId} onArchitectureUpdate={handleArchitectureUpdate} />
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-full">Loading...</div>}>
      <ChatPageContent />
    </Suspense>
  );
} 