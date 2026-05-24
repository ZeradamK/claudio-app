// src/app/page.tsx
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { useRouter } from 'next/navigation';
import { ArrowRight, Moon, Sun, Code, Zap, Server, Cloud, Database, Shield, Cpu, Workflow, GitBranch, Check, Settings } from 'lucide-react';
import { PlanBadge } from '@/components/plans/PlanBadge';
import LoadingScreen from '@/components/LoadingScreen';
import Squares from "@/components/Squares";
import { MainPageInput } from "@/components/ui/claude-style-ai-input";

const featurePhrases = [
  "Map a cloud architecture from a prompt",
  "Visualize microservices in real time",
  "Design cloud systems with AI precision",
  "Auto-generate scalable backend blueprints",
  "Prompt → Deployable cloud infra",
  "Diagram your ideas into production-ready systems",
  "Generate AWS CDK code from your architecture",
  "Design multi-tier cloud systems effortlessly",
  "Architect serverless applications with AI guidance",
  "Visualize complex data flows across services",
  "Create cloud-native architectures in seconds",
  "Optimize for performance, cost, and resilience",
  "Design architectures that follow AWS best practices",
  "Implement security controls with one prompt",
  "Build microservice systems with clear boundaries",
  "Generate infrastructure as code automatically",
  "Design disaster recovery solutions with AI",
  "Create multi-region high availability architectures",
  "Automate cloud compliance with intelligent design",
  "Transform business requirements into AWS architecture",
  "Plan migration paths with AI assistance",
  "Design event-driven architectures graphically",
  "Prototype cloud solutions in minutes, not days",
  "Build container orchestration with accurate dependencies",
  "Design data lakes and analytics pipelines visually"
];

/**
 * API key validation hook to check configuration on page load
 */
function useApiKeyValidation() {
  const [apiKeyStatus, setApiKeyStatus] = useState<{
    loading: boolean;
    cohereConfigured: boolean;
    googleaiConfigured: boolean;
    error: string | null;
  }>({
    loading: true,
    cohereConfigured: false,
    googleaiConfigured: false,
    error: null
  });

  useEffect(() => {
    const checkApiConfiguration = async () => {
      try {
        const response = await fetch('/api/check-config');
        
        if (!response.ok) {
          throw new Error('Failed to check API configuration');
        }
        
        const data = await response.json();
        
        setApiKeyStatus({
          loading: false,
          cohereConfigured: data.cohereConfigured,
          googleaiConfigured: data.googleaiConfigured,
          error: data.error || null
        });
      } catch (error) {
        console.error('Error checking API configuration:', error);
        setApiKeyStatus({
          loading: false,
          cohereConfigured: false,
          googleaiConfigured: false,
          error: 'Failed to check API configuration. Please check console for details.'
        });
      }
    };

    checkApiConfiguration();
  }, []);

  return apiKeyStatus;
}

// Add window interface declaration
declare global {
  interface Window {
    completeLoading?: () => void;
  }
}

export default function HomePage() {
  const router = useRouter();
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState('generating');
  const [progressStage, setProgressStage] = useState<'idle' | 'generating' | 'gettingReady'>('idle');
  const [showLoadingScreen, setShowLoadingScreen] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  // Validate API keys on page load
  const { loading, cohereConfigured, googleaiConfigured, error } = useApiKeyValidation();
  
  // Add status phase state
  const [statusPhase, setStatusPhase] = useState<number>(-1); // -1 = idle, 0+ = loading
  const statusMessages = [
    "Prompt sent..",
    "Generating Solution ..",
    "Optimizing for Scalability",
    "Retrieving Solution..."
  ];
  const [showLoadingScreenAfterGen, setShowLoadingScreenAfterGen] = useState(false);
  
  // Handle initial loading screen
  useEffect(() => {
    // Set a timeout to ensure the loading screen is displayed for at least 4 seconds
    const timer = setTimeout(() => {
      setShowLoadingScreen(false);
    }, 4000);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Rotating loading messages
  useEffect(() => {
    if (!isLoading) return;
    
    const messages = [
      'generating', 
      'building architecture', 
      'connecting services', 
      'optimizing design'
    ];
    
    let index = 0;
    const interval = setInterval(() => {
      index = (index + 1) % messages.length;
      setLoadingMessage(messages[index]);
    }, 3000);
    
    return () => clearInterval(interval);
  }, [isLoading]);

  // Phrase rotation animation
  useEffect(() => {
    // Setup interval to cycle through phrases with a transition effect
    const phraseInterval = setInterval(() => {
      // Trigger exit animation by adding class
      const phraseElement = document.querySelector('.phrase-item');
      if (phraseElement) {
        phraseElement.classList.add('phrase-exit');
        
        // Wait for exit animation, then change text and trigger entrance
        setTimeout(() => {
          setCurrentPhraseIndex((prevIndex) => 
            prevIndex === featurePhrases.length - 1 ? 0 : prevIndex + 1
          );
          
          // Remove exit class after content changes
          setTimeout(() => {
            const updatedElement = document.querySelector('.phrase-item');
            if (updatedElement) {
              updatedElement.classList.remove('phrase-exit');
            }
          }, 50);
        }, 500); // Time for exit animation
      }
    }, 5000); // Change phrases every 5 seconds
    
    return () => clearInterval(phraseInterval);
  }, []);

  const toggleTheme = () => {
    setDarkMode(!darkMode);
  };

  // Enhanced cloud provider detection from prompt
  const detectCloudProvider = (promptText: string): 'aws' | 'azure' | 'gcp' => {
    const lowerPrompt = promptText.toLowerCase();
    
    // Check for AWS references
    const awsKeywords = ['aws', 'amazon', 'lambda', 'ec2', 's3', 'dynamodb', 'cloudfront', 'rds', 'sqs', 'sns', 'ecs', 'eks', 'fargate'];
    
    // Check for Azure references
    const azureKeywords = ['azure', 'microsoft', 'functions', 'cosmos', 'blob', 'app service', 'virtual machine', 'sql database', 'frontdoor'];
    
    // Check for GCP references
    const gcpKeywords = ['gcp', 'google cloud', 'cloud functions', 'compute engine', 'cloud storage', 'bigtable', 'bigquery', 'gke'];
    
    // Count matches for each cloud provider
    const awsMatches = awsKeywords.filter(keyword => lowerPrompt.includes(keyword)).length;
    const azureMatches = azureKeywords.filter(keyword => lowerPrompt.includes(keyword)).length;
    const gcpMatches = gcpKeywords.filter(keyword => lowerPrompt.includes(keyword)).length;
    
    console.log(`Cloud provider keyword matches - AWS: ${awsMatches}, Azure: ${azureMatches}, GCP: ${gcpMatches}`);
    
    // Determine the cloud provider based on the highest number of matches
    if (azureMatches > awsMatches && azureMatches > gcpMatches) {
      return 'azure';
    } else if (gcpMatches > awsMatches && gcpMatches > azureMatches) {
      return 'gcp';
    }
    
    // Default to AWS if no clear winner or if AWS has the most matches
    return 'aws';
  };

  const handleGenerate = async (message: string) => {
    if (!message.trim()) return;
    setIsGenerating(true);
    setGenerationError(null);
    setProgressStage('generating');
    setStatusPhase(0);
    abortControllerRef.current = new AbortController();
    try {
      const cloudProvider = detectCloudProvider(message);
      let enhancedPrompt = message;
      const lowerPrompt = message.toLowerCase();
      if (!lowerPrompt.includes(cloudProvider) && 
          !lowerPrompt.includes(cloudProvider === 'aws' ? 'amazon' : 
                              cloudProvider === 'azure' ? 'microsoft' : 'google')) {
        enhancedPrompt = `Using ${cloudProvider === 'aws' ? 'AWS' : 
                                  cloudProvider === 'azure' ? 'Azure' : 
                                  'Google Cloud Platform'}, ${message}`;
      }
      // Call the API to generate the architecture
      const response = await fetch('/api/generate-architecture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: enhancedPrompt, cloudProvider }),
        signal: abortControllerRef.current.signal,
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error: ${response.status} - ${errorText || 'Unknown error'}`);
      }
      let data;
      try {
        data = await response.json();
      } catch (error) {
        throw new Error('Failed to parse server response. The server may be experiencing issues.');
      }
      if (!data.architectureId) {
        throw new Error('Server returned an invalid response without an architecture ID.');
      }
      // Simulate backend status phase updates (replace with real backend log polling if available)
      setStatusPhase(1);
      await new Promise(res => setTimeout(res, 1200));
      setStatusPhase(2);
      await new Promise(res => setTimeout(res, 1200));
      setStatusPhase(3);
      await new Promise(res => setTimeout(res, 1200));
      // Show loading screen and route
      setShowLoadingScreenAfterGen(true);
      setGenerationError(null);
      setIsGenerating(false);
      setProgressStage('idle');
      setStatusPhase(-1);
      router.push(`/architecture/${data.architectureId}`);
    } catch (error: any) {
      setStatusPhase(-1);
      if (error.name === 'AbortError') {
        setProgressStage('idle');
        return;
      }
      setProgressStage('idle');
      setIsGenerating(false);
      setGenerationError(error.message || 'An unexpected error occurred. Please try again.');
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
    setLoadingMessage('generating');
  };

  // If loading screen is active, show only that
  if (showLoadingScreen || showLoadingScreenAfterGen) {
    return <LoadingScreen onComplete={() => setShowLoadingScreen(false)} />;
  }

  return (
    <div className={`flex flex-col min-h-screen bg-white text-black relative overflow-hidden transition-colors duration-300 main-container`}>
      {/* Top-right utility nav */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
        <PlanBadge />
        <button
          onClick={() => router.push('/cloud')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${darkMode ? 'bg-gray-800 text-white hover:bg-gray-700' : 'bg-gray-50 text-gray-800 hover:bg-gray-100'} transition-colors duration-300`}
          aria-label="Cloud Operations"
        >
          <Cloud size={14} />
          Cloud
        </button>
        <button
          onClick={() => router.push('/settings/plan')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${darkMode ? 'bg-gray-800 text-white hover:bg-gray-700' : 'bg-gray-50 text-gray-800 hover:bg-gray-100'} transition-colors duration-300`}
          aria-label="Settings"
        >
          <Settings size={14} />
          Settings
        </button>
        <button
          onClick={toggleTheme}
          className={`p-2 rounded-full ${darkMode ? 'bg-gray-800 text-white' : 'bg-gray-50 text-gray-800'} transition-colors duration-300`}
          aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {darkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>
      {/* Main content */}
      <main className="flex-grow flex flex-col items-center justify-center px-4 relative z-10">
        <div className={`max-w-[1100px] w-full mx-auto flex flex-col items-center rounded-2xl p-8 transition-colors duration-300 bg-transparent`}>
        
          {/* Input form section - replaced with MainPageInput */}
          <MainPageInput
            onSendMessage={(message) => handleGenerate(message)}
            placeholder="Describe the architecture you need..."
            disabled={isGenerating}
            statusPhase={statusPhase}
            statusMessages={statusMessages}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className={`px-8 border-t bg-white ${darkMode ? 'border-gray-800 text-gray-600' : 'border-gray-200 text-gray-600'}`} style={{ height: '50px' }}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center h-full">
          <div className="md:mb-0">
            <p className="text-sm">
              © {new Date().getFullYear()} Claudio - Design Cloud architectures faster.
            </p>
          </div>
          <div className="flex space-x-6">
            <a href="#" className="text-sm hover:underline">About</a>
            <a href="#" className="text-sm hover:underline">Documentation</a>
            <a href="#" className="text-sm hover:underline">GitHub</a>
            <a href="#" className="text-sm hover:underline">Privacy</a>
          </div>
        </div>
      </footer>
      
      {/* API key error notification */}
      {!loading && error && (
        <div className="fixed bottom-4 left-4 right-4 bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded shadow-lg">
          <p className="font-bold">Configuration Error</p>
          <p>{error}</p>
          <p className="mt-2 text-sm">Please check your .env.local file and add the required API keys.</p>
        </div>
      )}

      {/* Add the grid pattern styles and feature phrase animation styles together */}
      <style jsx global>{`
        /* Glassy input container styles */
        .glassy-input-container {
          position: relative;
          border-radius: 24px;
          padding: 2px;
          background: linear-gradient(135deg, 
            rgba(255, 255, 255, 0.95) 0%, 
            rgba(255, 255, 255, 0.9) 25%,
            rgba(248, 250, 252, 0.92) 50%, 
            rgba(255, 255, 255, 0.94) 75%,
            rgba(255, 255, 255, 0.96) 100%);
          backdrop-filter: blur(15px) saturate(180%);
          -webkit-backdrop-filter: blur(15px) saturate(180%);
          box-shadow: 
            0 12px 40px rgba(0, 0, 0, 0.12),
            0 4px 16px rgba(0, 0, 0, 0.08),
            inset 0 3px 6px rgba(255, 255, 255, 0.95),
            inset 0 -3px 6px rgba(0, 0, 0, 0.08),
            inset 0 1px 2px rgba(255, 255, 255, 1);
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.8);
        }
        
        .glassy-input-container::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, 
            rgba(255, 255, 255, 0.6) 0%, 
            rgba(255, 255, 255, 0.2) 25%,
            transparent 50%, 
            rgba(255, 255, 255, 0.1) 75%,
            rgba(255, 255, 255, 0.4) 100%);
          pointer-events: none;
          border-radius: 24px;
        }
        
        .glassy-input-container::after {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: 
            repeating-conic-gradient(
              from 0deg at 50% 50%,
              transparent 0deg,
              rgba(255, 255, 255, 0.08) 1deg,
              transparent 2deg,
              transparent 45deg
            ),
            repeating-linear-gradient(
              45deg,
              transparent,
              transparent 49px,
              rgba(255, 255, 255, 0.12) 49px,
              rgba(255, 255, 255, 0.12) 50px
            ),
            repeating-linear-gradient(
              -45deg,
              transparent,
              transparent 49px,
              rgba(255, 255, 255, 0.08) 49px,
              rgba(255, 255, 255, 0.08) 50px
            ),
            radial-gradient(
              circle at 30% 30%,
              rgba(255, 255, 255, 0.15) 0%,
              transparent 50%
            ),
            radial-gradient(
              circle at 70% 70%,
              rgba(255, 255, 255, 0.1) 0%,
              transparent 50%
            );
          pointer-events: none;
          opacity: 0.8;
          mix-blend-mode: overlay;
        }
        
        .glassy-input-container.dark-mode {
          background: linear-gradient(135deg, 
            rgba(40, 40, 40, 0.95) 0%, 
            rgba(30, 30, 30, 0.9) 25%,
            rgba(25, 25, 25, 0.92) 50%, 
            rgba(35, 35, 35, 0.94) 75%,
            rgba(40, 40, 40, 0.96) 100%);
          box-shadow: 
            0 12px 40px rgba(0, 0, 0, 0.4),
            0 4px 16px rgba(0, 0, 0, 0.3),
            inset 0 3px 6px rgba(255, 255, 255, 0.15),
            inset 0 -3px 6px rgba(0, 0, 0, 0.4),
            inset 0 1px 2px rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .glassy-input-container.dark-mode::before {
          background: linear-gradient(135deg, 
            rgba(255, 255, 255, 0.15) 0%, 
            rgba(255, 255, 255, 0.05) 25%,
            transparent 50%, 
            rgba(255, 255, 255, 0.03) 75%,
            rgba(255, 255, 255, 0.1) 100%);
        }
        
        .glassy-input-container.dark-mode::after {
          background: 
            repeating-conic-gradient(
              from 0deg at 50% 50%,
              transparent 0deg,
              rgba(255, 255, 255, 0.04) 1deg,
              transparent 2deg,
              transparent 45deg
            ),
            repeating-linear-gradient(
              45deg,
              transparent,
              transparent 49px,
              rgba(255, 255, 255, 0.06) 49px,
              rgba(255, 255, 255, 0.06) 50px
            ),
            repeating-linear-gradient(
              -45deg,
              transparent,
              transparent 49px,
              rgba(255, 255, 255, 0.04) 49px,
              rgba(255, 255, 255, 0.04) 50px
            ),
            radial-gradient(
              circle at 30% 30%,
              rgba(255, 255, 255, 0.08) 0%,
              transparent 50%
            ),
            radial-gradient(
              circle at 70% 70%,
              rgba(255, 255, 255, 0.05) 0%,
              transparent 50%
            );
        }
        
        .glassy-input-container textarea {
          position: relative;
          z-index: 1;
          background: transparent !important;
          border: none !important;
        }
        
        .glassy-input-container:hover {
          box-shadow: 
            0 16px 48px rgba(0, 0, 0, 0.15),
            0 6px 20px rgba(0, 0, 0, 0.1),
            inset 0 3px 6px rgba(255, 255, 255, 1),
            inset 0 -3px 6px rgba(0, 0, 0, 0.1),
            inset 0 1px 2px rgba(255, 255, 255, 1);
          transform: translateY(-2px);
          transition: all 0.4s ease;
        }
        
        .glassy-input-container.dark-mode:hover {
          box-shadow: 
            0 16px 48px rgba(0, 0, 0, 0.5),
            0 6px 20px rgba(0, 0, 0, 0.4),
            inset 0 3px 6px rgba(255, 255, 255, 0.2),
            inset 0 -3px 6px rgba(0, 0, 0, 0.5),
            inset 0 1px 2px rgba(255, 255, 255, 0.15);
        }
        
        /* Focus states for glassy input - NO BORDER LINES */
        .glassy-input-container:focus-within {
          box-shadow: 
            0 20px 60px rgba(0, 0, 0, 0.18),
            0 8px 24px rgba(0, 0, 0, 0.12),
            inset 0 4px 8px rgba(255, 255, 255, 1),
            inset 0 -4px 8px rgba(0, 0, 0, 0.12),
            inset 0 2px 4px rgba(255, 255, 255, 1);
          transform: translateY(-3px);
          transition: all 0.4s ease;
        }
        
        .glassy-input-container.dark-mode:focus-within {
          box-shadow: 
            0 20px 60px rgba(0, 0, 0, 0.6),
            0 8px 24px rgba(0, 0, 0, 0.5),
            inset 0 4px 8px rgba(255, 255, 255, 0.25),
            inset 0 -4px 8px rgba(0, 0, 0, 0.6),
            inset 0 2px 4px rgba(255, 255, 255, 0.2);
        }
        
        /* Feature phrase animation - enhanced slide up effect */
        @keyframes fadeInText {
          0% { 
            opacity: 0; 
            transform: translateY(15px); 
          }
          20% {
            opacity: 0.4;
          }
          100% { 
            opacity: 0.7; 
            transform: translateY(0); 
          }
        }
        
        @keyframes fadeOutText {
          0% {
            opacity: 0.7;
            transform: translateY(0);
          }
          100% {
            opacity: 0;
            transform: translateY(-15px);
          }
        }
        
        .phrase-item {
          animation: fadeInText 1.2s ease-out forwards;
          transition: all 0.5s ease;
        }
        
        .phrase-item.phrase-exit {
          animation: fadeOutText 0.5s ease-out forwards;
        }
        
        /* Shiny text effect */
        .shiny-text, .group-hover\:shiny-text {
          text-shadow: 0 0 5px rgba(255, 255, 255, 0.8),
                      0 0 10px rgba(255, 255, 255, 0.5),
                      0 0 15px rgba(255, 255, 255, 0.3);
          letter-spacing: 0.02em;
        }
        
        /* Grid pattern styles */
        .main-container {
          width: 100%;
          height: 100%;
          --s: 100px; /* control the size */
          --_g: #0000 90deg, rgba(0,0,0,0.2) 0;
          background: conic-gradient(from 90deg at 2px 2px, var(--_g)),
            conic-gradient(from 90deg at 1px 1px, var(--_g));
          background-size: var(--s) var(--s), calc(var(--s) / 5) calc(var(--s) / 5);
        }
        
        /* Adjust for dark mode */
        .dark .main-container,
        .bg-black.main-container {
          --_g: #0000 90deg, rgba(255,255,255,0.15) 0;
        }

        /* Placeholder animation and input field styling */
        .placeholder-animation::placeholder {
          color: rgba(0, 0, 0, 0.3);
          font-weight: 300;
          transition: color 0.3s ease;
        }

        .placeholder-animation:focus::placeholder {
          color: rgba(0, 0, 0, 0.15);
        }
        
        /* Generate tooltip styling */
        .generate-tooltip {
          position: absolute;
          bottom: -30px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 12px;
          color: #666;
          white-space: nowrap;
          opacity: 0.7;
          transition: opacity 0.3s ease;
        }

        .glassy-input-container textarea:focus {
          outline: none;
          box-shadow: none;
          border-color: transparent;
        }

        .generate-tooltip {
          margin-top: 1rem;
          text-align: center;
          transition: all 0.3s ease;
          transform: translateY(0);
          opacity: 0.9;
        }

        .generate-tooltip:hover {
          transform: translateY(-1px);
          opacity: 1;
        }
      `}</style>
    </div>
  );
}