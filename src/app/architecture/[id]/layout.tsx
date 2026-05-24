"use client";

import React from 'react';

export default function ArchitectureLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-white">
      {/* Main content area */}
      <main className="flex-1 relative">{children}</main>
    </div>
  );
} 