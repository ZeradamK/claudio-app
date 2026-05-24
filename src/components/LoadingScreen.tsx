import React, { useEffect, useState } from 'react';

interface LoadingScreenProps {
  minDisplayTime?: number; // Minimum time to display in ms
  onComplete?: () => void; // Callback when minimum time has elapsed
}

export default function LoadingScreen({
  minDisplayTime = 4000, // Updated to 4 seconds (4000ms)
  onComplete
}: LoadingScreenProps) {
  const [active, setActive] = useState<boolean>(true);

  useEffect(() => {
    let startTime = Date.now();
    // Set timeout for minimum display time
    const minTimeTimeout = setTimeout(() => {
      const elapsedTime = Date.now() - startTime;
      if (elapsedTime >= minDisplayTime) {
        setActive(false);
        if (onComplete) onComplete();
      } else {
        const remainingTime = minDisplayTime - elapsedTime;
        setTimeout(() => {
          setActive(false);
          if (onComplete) onComplete();
        }, remainingTime);
      }
    }, minDisplayTime);
    if (typeof window !== 'undefined') {
      (window as any).completeLoading = () => {
        clearTimeout(minTimeTimeout);
        setActive(false);
        if (onComplete) onComplete();
      };
    }
    return () => {
      clearTimeout(minTimeTimeout);
      if (typeof window !== 'undefined') {
        delete (window as any).completeLoading;
      }
    };
  }, [minDisplayTime, onComplete]);

  if (!active && onComplete) return null;

  return (
    <div className="fixed inset-0 bg-white flex items-center justify-center z-50">
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