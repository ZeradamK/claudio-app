"use client";
import {
  Plus,
  File,
  Camera,
  X,
  Brain,
  ChevronDown,
  Lock,
  Unlock,
} from "lucide-react";
import { type RefObject } from "react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useAutoResizeTextarea } from "@/hooks/use-auto-resize-textarea";
import { useFileInput } from "@/hooks/use-file-input";
import { useClickOutside } from "@/hooks/use-click-outside";

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, RotateCcw, Lightbulb, Copy, Check, Code, Terminal, Loader2, Send } from "lucide-react";
import ReactMarkdown from 'react-markdown';
// Using React's standard code highlighting
import { v4 as uuidv4 } from 'uuid';
import remarkGfm from 'remark-gfm';
import ClaudioChatInput from './ClaudioChatInput';
import { Highlight } from 'prism-react-renderer';

// Custom theme for code highlighting (white background with colorful syntax)
const cursorIdeTheme = {
  plain: {
    backgroundColor: '#fff',
    color: '#23272e',
    fontSize: 12,
    fontFamily: 'Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  },
  styles: [
    { types: ['comment'], style: { color: '#6a9955', fontStyle: 'italic' as const } },
    { types: ['string', 'inserted'], style: { color: '#b56959' } },
    { types: ['number'], style: { color: '#1c00cf' } },
    { types: ['builtin', 'char', 'constant', 'function'], style: { color: '#005cc5', fontWeight: 'bold' as const } },
    { types: ['punctuation', 'symbol'], style: { color: '#23272e' } },
    { types: ['variable'], style: { color: '#e36209', fontWeight: 'bold' as const } },
    { types: ['keyword', 'tag', 'deleted'], style: { color: '#d73a49' } },
    { types: ['operator'], style: { color: '#23272e' } },
    { types: ['class-name'], style: { color: '#6f42c1', fontWeight: 'bold' as const } },
    { types: ['attr-name'], style: { color: '#005cc5' } },
    { types: ['boolean'], style: { color: '#d73a49' } },
    { types: ['property'], style: { color: '#005cc5' } },
    { types: ['namespace'], style: { color: '#6f42c1' } },
  ],
};

// Add this debounce function if you don't want to install lodash
const debounce = (func: Function, wait: number) => {
  let timeout: NodeJS.Timeout;
  return function executedFunction(...args: any[]) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ClaudioChatProps {
  architectureId: string;
  onArchitectureUpdate: () => void;
  cloudProvider?: 'aws' | 'azure' | 'gcp'; // Optional prop to receive cloud provider from parent
  setIsMinimized?: (min: boolean) => void; // Optional prop for floating chat minimize
}

// Memoize the ReactMarkdown component for better performance
const MemoizedReactMarkdown = React.memo(ReactMarkdown);

export default function ClaudioChat({ architectureId, onArchitectureUpdate, cloudProvider: initialCloudProvider = 'aws', setIsMinimized }: ClaudioChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showExamples, setShowExamples] = useState(true);
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);
  const [isAutoscrollEnabled, setIsAutoscrollEnabled] = useState(true);
  const [detectedCloudProvider, setDetectedCloudProvider] = useState<'aws' | 'azure' | 'gcp'>(initialCloudProvider);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null); // Ref for AbortController
  const [selectedModel, setSelectedModel] = useState('Claudio-V0.1');
  const [isPrivacyMode, setIsPrivacyMode] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [cdkLanguage, setCdkLanguage] = useState('typescript');
  const [isGeneratingCdk, setIsGeneratingCdk] = useState(false);
  const [cdkDownloadReady, setCdkDownloadReady] = useState(false);
  const [pendingCdkExport, setPendingCdkExport] = useState<null | { lastUserMessage: string }>(null);
  const [glowModelSelector, setGlowModelSelector] = useState(false);
  const [userHasScrolledUp, setUserHasScrolledUp] = useState(false);
  const [pendingDownload, setPendingDownload] = useState<null | { url: string, fileName: string, fileType: string }>(null);
  const downloadBtnRef = useRef<HTMLButtonElement>(null);
  const [lastImagePreview, setLastImagePreview] = useState<string | null>(null);
  const [webSearchEnabled, setWebSearchEnabled] = useState(false); // Web search toggle

  // First, let's update the welcome message to better highlight the architecture modification capabilities
  const welcomeMessage: Message = {
    id: 'welcome',
    role: 'assistant',
    content: '', // Empty content - no initial greeting
    timestamp: new Date()
  };

  // Cloud provider-specific example prompts
  const awsExamplePrompts = [
    "Add a Multi-AZ Aurora RDS cluster connected to my application tier",
    "Convert my architecture to use API Gateway, Lambda, and DynamoDB",
    "Add a caching layer with ElastiCache Redis in front of the database",
    "Replace the EC2 web servers with a serverless architecture",
    "Add a CloudFront CDN with an S3 origin for static assets", 
    "Implement a disaster recovery region with cross-region replication",
    "Add auto-scaling for EC2 instances based on CPU utilization",
    "Implement a private VPC with proper public and private subnets",
    "Update the architecture to include ECS for containerized services",
    "Add AWS WAF and Shield for improved security",
    "Create a microservices architecture with API Gateway and Lambda",
    "Add a data lake using S3, Glue, and Athena for analytics",
    "Implement a CI/CD pipeline with CodePipeline and CodeBuild",
    "Add monitoring and alerting with CloudWatch and SNS",
    "Create a secure multi-tier architecture with proper IAM roles"
  ];

  const azureExamplePrompts = [
    "Add an Azure SQL Database with geo-replication to my application",
    "Convert my architecture to use API Management, Azure Functions, and Cosmos DB",
    "Add Azure Cache for Redis in front of the database for better performance",
    "Replace VM-based web servers with Azure App Service for better scaling",
    "Add Azure CDN with Blob Storage for static content delivery", 
    "Implement a disaster recovery strategy using Azure Site Recovery",
    "Set up auto-scaling for Azure Virtual Machine Scale Sets",
    "Implement a secure Virtual Network with proper subnets and NSGs",
    "Update the architecture to use Azure Kubernetes Service for containers",
    "Add Azure Front Door and Web Application Firewall for security"
  ];

  const gcpExamplePrompts = [
    "Add a Cloud SQL instance with high availability to my application",
    "Convert my architecture to use API Gateway, Cloud Functions, and Firestore",
    "Add Memorystore for Redis as a caching layer in front of the database",
    "Replace Compute Engine VMs with Cloud Run for serverless containers",
    "Add Cloud CDN with Cloud Storage for serving static assets", 
    "Implement a multi-region disaster recovery strategy on GCP",
    "Set up auto-scaling for Compute Engine instance groups",
    "Design a secure VPC network with proper subnets and firewall rules",
    "Update the architecture to use Google Kubernetes Engine for containers",
    "Add Cloud Armor and Identity-Aware Proxy for enhanced security"
  ];

  //Here we will implement the UI for the claudio chat input field
  const AI_MODELS = [
    { name: "Claudio-V0.1", description: "The popular kid" },
    { name: "DeepDesign", description: "Time flies, he is old now..." },
    { name: "Deep Analysis", description: "Cost, rationale, metrics, and more" },
  ].map((model) => ({ ...model, icon: <Brain className="w-4 h-4" /> }));






  // Function to detect cloud provider from input text
  const detectCloudProvider = (inputText: string): 'aws' | 'azure' | 'gcp' => {
    const lowerInput = inputText.toLowerCase();
    
    // Check for AWS references
    const awsKeywords = ['aws', 'amazon', 'lambda', 'ec2', 's3', 'dynamodb', 'cloudfront', 'rds', 'sqs', 'sns', 'ecs', 'eks', 'fargate'];
    
    // Check for Azure references
    const azureKeywords = ['azure', 'microsoft', 'functions', 'cosmos', 'blob', 'app service', 'virtual machine', 'sql database', 'frontdoor'];
    
    // Check for GCP references
    const gcpKeywords = ['gcp', 'google cloud', 'cloud functions', 'compute engine', 'cloud storage', 'bigtable', 'bigquery', 'gke'];
    
    // Count matches for each cloud provider
    const awsMatches = awsKeywords.filter(keyword => lowerInput.includes(keyword)).length;
    const azureMatches = azureKeywords.filter(keyword => lowerInput.includes(keyword)).length;
    const gcpMatches = gcpKeywords.filter(keyword => lowerInput.includes(keyword)).length;
    
    // Determine the cloud provider based on the highest number of matches
    if (azureMatches > awsMatches && azureMatches > gcpMatches) {
      return 'azure';
    } else if (gcpMatches > awsMatches && gcpMatches > azureMatches) {
      return 'gcp';
    }
    
    // Default to current provider or AWS if no clear winner
    return detectedCloudProvider || 'aws';
  };

  // Update the example prompts based on the detected cloud provider
  const getExamplePromptsByProvider = () => {
    switch (detectedCloudProvider) {
      case 'azure':
        return azureExamplePrompts;
      case 'gcp':
        return gcpExamplePrompts;
      default:
        return awsExamplePrompts;
    }
  };

  // Update detectedCloudProvider when initialCloudProvider changes
  useEffect(() => {
    if (initialCloudProvider !== detectedCloudProvider) {
      setDetectedCloudProvider(initialCloudProvider);
    }
  }, [initialCloudProvider]);

  // Load messages from localStorage on component mount
  useEffect(() => {
    const loadedMessages = loadMessages();
    if (loadedMessages.length === 0) {
      // If no messages, don't add welcome message - just set empty array
      setMessages([]);
      // Show examples when there are no messages
      setShowExamples(true);
    } else {
      setMessages(loadedMessages);
      // Only show examples if there are no messages
      setShowExamples(loadedMessages.length <= 1);
      
      // Detect cloud provider from existing messages
      if (loadedMessages.length > 0) {
        const userMessages = loadedMessages.filter((msg: Message) => msg.role === 'user');
        if (userMessages.length > 0) {
          // Analyze all user messages to detect cloud provider
          const allUserContent = userMessages.map((msg: Message) => msg.content).join(' ');
          const detectedProvider = detectCloudProvider(allUserContent);
          setDetectedCloudProvider(detectedProvider);
        }
      }
    }
  }, []);
  
  // Track scroll position to determine if we should auto-scroll
  const handleScroll = useCallback(() => {
    if (!messagesContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    // If user is within 80px of the bottom, enable auto-scroll
    const isAtBottom = Math.abs(scrollHeight - clientHeight - scrollTop) < 80;
    setIsAutoscrollEnabled(isAtBottom);
    setUserHasScrolledUp(!isAtBottom);
  }, []);

  // Add scroll event listener
  useEffect(() => {
    const messagesContainer = messagesContainerRef.current;
    if (messagesContainer) {
      messagesContainer.addEventListener('scroll', handleScroll, { passive: true });
      return () => messagesContainer.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  // Improved scroll to bottom: only smooth if user is at bottom, else do nothing
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current && messagesContainerRef.current) {
      if (!userHasScrolledUp) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [userHasScrolledUp]);

  // Optimize scrolling to prevent performance issues
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Reset copied snippet after 2 seconds
  useEffect(() => {
    if (copiedSnippet) {
      const timer = setTimeout(() => {
        setCopiedSnippet(null);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [copiedSnippet]);

  // Load messages from localStorage
  const loadMessages = () => {
    try {
      const savedMessages = localStorage.getItem(`jarvis-chat-${architectureId}`);
      if (savedMessages) {
        const parsedMessages = JSON.parse(savedMessages);
        // Convert string timestamps back to Date objects
        return parsedMessages.map((msg: { id: string; role: string; content: string; timestamp: string }) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
      }
    } catch (error) {
      console.error('Error loading messages from localStorage:', error);
    }
    return [];
  };

  // Save messages to localStorage
  const saveMessages = (messagesToSave: Message[]) => {
    try {
      localStorage.setItem(`jarvis-chat-${architectureId}`, JSON.stringify(messagesToSave));
    } catch (error) {
      console.error('Error saving messages to localStorage:', error);
    }
  };

  // Select random examples
  const getRandomExamples = (count: number) => {
    const providerExamples = getExamplePromptsByProvider();
    const shuffled = [...providerExamples].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  };

  // Randomized examples that change on each render, specific to the detected cloud provider
  const randomExamples = useMemo(() => getRandomExamples(3), [detectedCloudProvider]);

  // Enhanced version of handleExampleClick to immediately set display value and update cloud provider
  const handleExampleClick = (example: string) => {
    // Detect cloud provider from example
    const providerFromExample = detectCloudProvider(example);
    if (providerFromExample !== detectedCloudProvider) {
      setDetectedCloudProvider(providerFromExample);
    }
    
    setInputValue(example);
    setShowExamples(false);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Copy code to clipboard
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedSnippet(code);
  };

  // Debounced input handler to prevent typing lag and detect cloud provider
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSetInput = useCallback(
    debounce((value: string) => {
      setInputValue(value);
      
      // Detect cloud provider from input
      if (value.trim().length > 10) { // Only attempt detection on substantial input
        const providerFromInput = detectCloudProvider(value);
        if (providerFromInput !== detectedCloudProvider) {
          setDetectedCloudProvider(providerFromInput);
        }
      }
    }, 150), // 150ms debounce time - adjust as needed
    [detectedCloudProvider]
  );

  // Handle immediate visual update + debounced state update
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    debouncedSetInput(value); // Debounce the actual state update
  };

  // Helper: Parse if user is requesting a CDK export and extract language if present
  function parseCdkExportRequest(text: string): { language?: string } | null {
    const lower = text.toLowerCase();
    if (lower.includes('cdk') && (lower.includes('export') || lower.includes('generate'))) {
      // Try to extract language
      const langs = ['typescript', 'python', 'javascript', 'java', 'c#', 'csharp'];
      const found = langs.find(l => lower.includes(l));
      return { language: found === 'csharp' ? 'csharp' : found };
    }
    return null;
  }
  // Helper: Parse language from user reply
  function parseCdkLanguage(text: string): string | null {
    const lower = text.toLowerCase();
    if (lower.includes('typescript')) return 'typescript';
    if (lower.includes('python')) return 'python';
    if (lower.includes('javascript')) return 'javascript';
    if (lower.includes('java') && !lower.includes('javascript')) return 'java';
    if (lower.includes('c#') || lower.includes('csharp')) return 'csharp';
    return null;
  }
  // Helper: Add assistant message to chat
  async function addAssistantMessage(content: string) {
    setMessages(prev => ([...prev, { id: uuidv4(), role: 'assistant', content, timestamp: new Date() }]));
    saveMessages([...messages, { id: uuidv4(), role: 'assistant', content, timestamp: new Date() }]);
  }
  // Helper: Generate CDK and send download link
  async function generateAndSendCdk(language: string) {
    setIsGeneratingCdk(true);
    try {
      const response = await fetch('/api/generate-cdk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ architectureId, language }),
      });
      if (!response.ok) throw new Error('Failed to generate CDK');
      await addAssistantMessage(`Your CDK file is ready! [Download CDK]('/api/download-cdk/${architectureId}') (${language})`);
    } catch (e) {
      await addAssistantMessage('Error generating CDK: ' + (e instanceof Error ? e.message : e));
    } finally {
      setIsGeneratingCdk(false);
    }
  }

  // Helper: Detect if a message is code intent (for rendering code blocks)
  function isCodeIntent(content: string): boolean {
    // Heuristic: code fences, import/export, function/class, =>, const/let/var, or language tags
    return /```|import |export |function |class |const |let |var |=>|#include|def |public |private |<script|<style|<template|\bpython\b|\btypescript\b|\bjavascript\b|\bjava\b|\bc#\b|\bcsharp\b|\bcode\b|\/\//i.test(content);
  }

  // Helper: Detect Deep Analysis intent
  function getDeepAnalysisIntent(input: string): 'cost' | 'rationale' | 'metrics' | 'improvement' | null {
    const lower = input.toLowerCase();
    if (lower.includes('cost') || lower.includes('excel')) return 'cost';
    if (lower.includes('rationale') || lower.includes('report') || lower.includes('pdf')) return 'rationale';
    if (lower.includes('metric') || lower.includes('graph') || lower.includes('chart')) return 'metrics';
    if (lower.includes('improve') || lower.includes('better') || lower.includes('architecture')) return 'improvement';
    return null;
  }

  // Helper: Get icon path for file type
  function getFileIcon(type: string) {
    if (type === 'excel') return '/deepanalysis/excel.png';
    if (type === 'pdf') return '/deepanalysis/pdf.png';
    if (type === 'word') return '/deepanalysis/word.png';
    if (type === 'code') return '/deepanalysis/code.png';
    return '/deepanalysis/file.png';
  }

  // Send message to Claudio with cloud provider context
  const handleSendMessage = async () => {
    if (selectedModel === 'Claudio-V0.1' && isArchitectureEditCommand(inputValue)) {
      await addAssistantMessage('With Claudio-V0.1, you cannot add, remove, delete, or restructure components. Please select DeepDesign by Claudio in the input field to use these features.');
      setGlowModelSelector(true);
      setTimeout(() => setGlowModelSelector(false), 2000);
      setInputValue('');
      return;
    }
    const valueToSend = inputValue.trim();
    if (!valueToSend || isLoading) return;

    // CDK export logic for DeepDesign mode
    if (selectedModel === 'DeepDesign') {
      // If waiting for language, treat this message as the language
      if (pendingCdkExport) {
        const language = parseCdkLanguage(inputValue);
        if (!language) {
          await addAssistantMessage('Please specify a valid programming language for the CDK export (TypeScript, Python, JavaScript, Java, C#).');
          setInputValue('');
          return;
        }
        await generateAndSendCdk(language);
        setPendingCdkExport(null);
        setInputValue('');
        return;
      }
      // Detect CDK export request in user message
      const cdkRequest = parseCdkExportRequest(valueToSend);
      if (cdkRequest) {
        if (!cdkRequest.language) {
          await addAssistantMessage('Which programming language do you want the CDK in? (TypeScript, Python, JavaScript, Java, C#)');
          setPendingCdkExport({ lastUserMessage: valueToSend });
          setInputValue('');
          return;
        } else {
          await generateAndSendCdk(cdkRequest.language);
          setInputValue('');
          return;
        }
      }
    }
    if (selectedModel === 'Deep Analysis') {
      const intent = getDeepAnalysisIntent(valueToSend);
      if (intent) {
        setIsLoading(true);
        // Show loading bar message (React state, not HTML string)
        setMessages(prev => ([
          ...prev,
          {
            id: uuidv4(),
            role: 'assistant',
            content: '__DEEPANALYSIS_LOADING__',
            timestamp: new Date(),
          },
        ]));
        let fileUrl = '';
        let fileType = '';
        let fileName = '';
        let imagePreview = '';
        try {
          await new Promise(res => setTimeout(res, 1000 + Math.random() * 9000)); // Simulate up to 10s
          if (intent === 'cost') {
            const res = await fetch('/api/deep-analysis/cost-excel', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ architectureId, userPrompt: valueToSend }),
            });
            const blob = await res.blob();
            fileUrl = URL.createObjectURL(blob);
            fileType = 'excel';
            fileName = 'cost-breakdown.xlsx';
          } else if (intent === 'rationale') {
            const res = await fetch('/api/deep-analysis/rationale-pdf', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ architectureId }),
            });
            const blob = await res.blob();
            fileUrl = URL.createObjectURL(blob);
            fileType = 'pdf';
            fileName = 'rationale-report.pdf';
          } else if (intent === 'metrics') {
            const res = await fetch('/api/deep-analysis/metrics-graph', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ architectureId }),
            });
            const blob = await res.blob();
            imagePreview = URL.createObjectURL(blob);
            fileType = 'image';
          } else if (intent === 'improvement') {
            const res = await fetch('/api/deep-analysis/improved-architecture', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ architectureId }),
            });
            const blob = await res.blob();
            imagePreview = URL.createObjectURL(blob);
            fileType = 'image';
          }
          // Remove the loading bar message
          setMessages(prev => prev.filter(msg => msg.content !== '__DEEPANALYSIS_LOADING__'));
          // Add a chat message with the file/image as a React file card and a breakdown
          if (fileType === 'excel' || fileType === 'pdf' || fileType === 'word' || fileType === 'code') {
            setPendingDownload({ url: fileUrl, fileName, fileType });
            setMessages(prev => ([
              ...prev,
              {
                id: uuidv4(),
                role: 'assistant',
                content: '__DEEPANALYSIS_FILE__',
                timestamp: new Date(),
              },
              // Add a breakdown/summary message after the file card
              {
                id: uuidv4(),
                role: 'assistant',
                content:
                  fileType === 'excel'
                    ? 'This Excel file provides a detailed cost forecast for every segment of your architecture, including web, app, database, cache, and CDN layers. Each service is accounted for with usage-based cost estimation.'
                    : fileType === 'pdf'
                    ? 'This PDF contains a comprehensive rationale report, analyzing your architecture against AWS Well-Architected principles.'
                    : fileType === 'word'
                    ? 'This Word document summarizes your architecture and recommendations.'
                    : fileType === 'code'
                    ? 'This file contains code or configuration generated for your architecture.'
                    : '',
                timestamp: new Date(),
              },
            ]));
          } else if (fileType === 'image' && imagePreview) {
            setLastImagePreview(imagePreview);
            setMessages(prev => ([
              ...prev,
              {
                id: uuidv4(),
                role: 'assistant',
                content: '__DEEPANALYSIS_IMAGE__',
                timestamp: new Date(),
              },
              // Add a description message after the image
              {
                id: uuidv4(),
                role: 'assistant',
                content:
                  intent === 'improvement'
                    ? 'This image shows the improved architecture. Key changes include optimized service placement, enhanced security layers, and better resource allocation for cost and performance.'
                    : intent === 'metrics'
                    ? 'This graph visualizes key metrics for your architecture, such as service usage and performance.'
                    : 'This image represents the requested analysis.',
                timestamp: new Date(),
              },
            ]));
          } else {
            setMessages(prev => ([...prev, { id: uuidv4(), role: 'assistant', content: 'Analysis complete.', timestamp: new Date() }]));
          }
        } catch (e) {
          setMessages(prev => ([...prev, { id: uuidv4(), role: 'assistant', content: 'Error generating analysis file.', timestamp: new Date() }]));
        } finally {
          setIsLoading(false);
        }
        setInputValue('');
        return;
      }
    }
    setIsLoading(true);
    abortControllerRef.current = new AbortController(); // Create new controller
    const signal = abortControllerRef.current.signal;

    // Enable auto-scrolling for new messages
    setIsAutoscrollEnabled(true);

    // Detect cloud provider from the message being sent
    const providerFromMessage = detectCloudProvider(valueToSend);
    if (providerFromMessage !== detectedCloudProvider) {
      setDetectedCloudProvider(providerFromMessage);
    }

    // Add user message to chat
    const userMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content: valueToSend,
      timestamp: new Date()
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    saveMessages(updatedMessages);
    
    // Clear input immediately for better UX
    setInputValue('');
    
    // Create assistant message immediately (no loading state)
    const assistantId = uuidv4();
    const assistantMessage: Message = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date()
    };
    
    // Add empty assistant message immediately
    const messagesWithAssistant = [...updatedMessages, assistantMessage];
    setMessages(messagesWithAssistant);
    
    // Start streaming immediately
    try {
      // Use the jarvis-claude endpoint with streaming response
      const response = await fetch('/api/jarvis-claude', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage.content,
          architectureId,
          messageHistory: updatedMessages.slice(-10), // Send last 10 messages for context
          cloudProvider: detectedCloudProvider, // Include detected cloud provider
          webSearchEnabled // pass to backend
        }),
        signal: signal, // Pass the signal to fetch
      });

      // Clear controller ref after fetch completes or fails normally
      abortControllerRef.current = null;

      // Handle non-OK responses first
      if (!response.ok) {
        // Check if aborted
        if (signal.aborted) {
          console.log("Claudio fetch aborted by user.");
          // Remove the assistant message if aborted
          setMessages(updatedMessages);
          saveMessages(updatedMessages);
          return; // Exit early
        }
        // Handle other errors
        throw new Error(`Server responded with ${response.status}`);
      }

      // Process the streaming response immediately
      const reader = response.body?.getReader();
      if (!reader) throw new Error('Response has no body');
      
      const decoder = new TextDecoder();
      let accumulatedContent = '';
      
      // Start processing stream immediately
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        // Decode chunk and add to accumulated content
        const chunk = decoder.decode(value, { stream: true });
        accumulatedContent += chunk;
        
        // Update the assistant message immediately with new content
        setMessages(prevMessages => {
          const updatedMsgs = [...prevMessages];
          const assistantIndex = updatedMsgs.findIndex(msg => msg.id === assistantId);
          if (assistantIndex !== -1) {
            updatedMsgs[assistantIndex] = {
              ...updatedMsgs[assistantIndex],
              content: accumulatedContent
            };
          }
          return updatedMsgs;
        });
        
        // Auto-scroll as content comes in
        if (isAutoscrollEnabled) {
          requestAnimationFrame(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
          });
        }
      }
      
      // Check for architecture updates in the final response
      const updateIndicators = [
        'Architecture Updated Successfully',
        '**Architecture Updated Successfully**',
        '*Architecture Updated Successfully*',
        'The architecture has been updated',
        "I've updated the architecture",
        "I've modified the architecture",
        'The diagram has been updated',
        'Changes have been applied to your architecture',
        'The architecture diagram now includes',
        "I've added the requested components"
      ];

      // Strict conversational mode for Claudio-V0.1
      if (selectedModel === 'Claudio-V0.1') {
        let conversationalContent = accumulatedContent;
        // Remove update indicators
        updateIndicators.forEach(indicator => {
          conversationalContent = conversationalContent.replace(indicator, '');
        });
        // Remove code blocks if not code intent
        if (!isCodeIntent(conversationalContent)) {
          conversationalContent = conversationalContent
            .replace(/```[\s\S]*?```/g, '')
            .replace(/\n{2,}/g, '\n')
            .trim();
        }
        // Remove JSON blocks and error messages
        conversationalContent = conversationalContent
          .replace(/```json[\s\S]*?```/g, '')
          .replace(/\{[\s\S]*?\}/g, '')
          .replace(/"success"\s*:\s*(true|false)/g, '')
          .replace(/architectureUpdated\s*:\s*(true|false)/g, '')
          .replace(/message\s*:\s*"[^"]*"/g, '')
          .replace(/error\s*:\s*"[^"]*"/g, '')
          .replace(/Failed to update architecture[^\n]*/g, '')
          .replace(/update[^\n]*architecture[^\n]*/gi, '')
          .replace(/✅|❌/g, '')
          .replace(/Changes?:[^\n]*/gi, '')
          .replace(/\n{2,}/g, '\n')
          .trim();
        setMessages(prevMessages => {
          const finalMessages = [...prevMessages];
          const assistantIndex = finalMessages.findIndex(msg => msg.id === assistantId);
          if (assistantIndex !== -1) {
            finalMessages[assistantIndex] = {
              ...finalMessages[assistantIndex],
              content: conversationalContent
            };
          }
          saveMessages(finalMessages);
          return finalMessages;
        });
        setIsLoading(false);
        return;
      }

      // Check if architecture was updated (DeepDesign only)
      const wasArchitectureUpdated = updateIndicators.some(indicator => 
        accumulatedContent.includes(indicator));
      if (wasArchitectureUpdated) {
        setTimeout(() => {
          onArchitectureUpdate();
        }, 500);
      }
      
    } catch (error: any) {
      // Clear the controller ref if an error occurs
      abortControllerRef.current = null;

      // Check if it's an AbortError
      if (error.name === 'AbortError') {
        console.log('Claudio fetch operation aborted.');
        // Remove the assistant message if aborted
        setMessages(updatedMessages);
        saveMessages(updatedMessages);
      } else {
        console.error('Error sending message to Claudio:', error);
        
        // Replace assistant message with error message
        setMessages(prevMessages => {
          const finalMessages = [...prevMessages];
          const assistantIndex = finalMessages.findIndex(msg => msg.id === assistantId);
          if (assistantIndex !== -1) {
            finalMessages[assistantIndex] = {
              ...finalMessages[assistantIndex],
              content: 'Sorry, I encountered an error. Please try again.'
            };
          }
          saveMessages(finalMessages);
          return finalMessages;
        });
      }
    } finally {
      // Reset loading state
      setIsLoading(false);
    }
  };

  // Function to handle stopping the message sending
  const handleStopSending = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort(); // Abort the fetch
      abortControllerRef.current = null; // Clear the ref
    }
    setIsLoading(false); // Reset loading state
    // The AbortError handler in handleSendMessage will clean up the message list
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Clear conversation history
  const clearConversation = () => {
    // Set messages to empty array instead of keeping welcomeMessage
    setMessages([]);
    
    // Clear localStorage for this architecture
    try {
      localStorage.removeItem(`jarvis-chat-${architectureId}`);
    } catch (error) {
      console.error('Error clearing messages from localStorage:', error);
    }
    
    // Show example prompts
    setShowExamples(true);
    
    // Reset input field
    setInputValue('');
    
    // Clear API abort controller if active
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    // Reset loading state
    setIsLoading(false);
    
    // Enable auto-scrolling
    setIsAutoscrollEnabled(true);
    
    // Clear any copied code snippet state
    setCopiedSnippet(null);
    
    // Optional: Also clear from API cache if needed
    fetch(`/api/clear-chat-session?architectureId=${architectureId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    }).catch(error => {
      // Silently fail - this is just an optimization
      console.log('Failed to clear API chat session:', error);
    });
  };

  // Toggle auto-scroll button handler
  const toggleAutoScroll = () => {
    setIsAutoscrollEnabled(prev => !prev);
    if (!isAutoscrollEnabled) {
      // If turning auto-scroll back on, scroll to bottom
      scrollToBottom();
    }
  };

  // Use a simpler code block implementation
  const CodeBlock = useCallback(({ node, inline, className, children, ...props }: any) => {
    const match = /language-(\w+)/.exec(className || '');
    const codeString = String(children).replace(/\n$/, '');
    const language = match ? match[1] : 'typescript';
    const [isLinting, setIsLinting] = React.useState(false);
    const [lintStatus, setLintStatus] = React.useState<string | null>(null);
    const [isValidating, setIsValidating] = React.useState(false);
    const [validationResult, setValidationResult] = React.useState<string | null>(null);
    const [showReview, setShowReview] = React.useState(false);
    const [currentCode, setCurrentCode] = React.useState(codeString);
    const isCdk = ['python', 'typescript', 'javascript', 'java', 'csharp', 'terraform', 'hcl'].includes(language);

    const handleCodeTest = async () => {
      setIsLinting(true);
      setLintStatus('Linting...');
      try {
        const response = await fetch('/api/validate-cdk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: currentCode, language }),
        });
        const data = await response.json();
        if (data.lintMessage) {
          setLintStatus(data.lintMessage);
          if (data.cdkCode && data.cdkCode !== currentCode) {
            setCurrentCode(data.cdkCode);
          }
        } else {
          setLintStatus('No lint found.');
        }
        setValidationResult(data.result || 'No issues found.');
        setShowReview(true);
      } catch (e) {
        setLintStatus('Linting failed.');
        setValidationResult('Validation failed.');
        setShowReview(true);
      } finally {
        setIsLinting(false);
      }
    };

    const handleReview = () => {
      if (validationResult) {
        addAssistantMessage(`CDK Validation Results:\n${validationResult}`);
      }
    };

    if (inline) {
      return (
        <code className="px-1 py-0.5 bg-gray-100 rounded text-[0.95em] font-mono text-gray-900" {...props}>
          {children}
        </code>
      );
    }

    return (
      <div className="relative rounded-lg my-3 shadow-lg overflow-hidden border border-gray-300 bg-white">
        <div className="flex items-center justify-between px-4 py-2 bg-gray-50 text-xs text-gray-700 rounded-t-lg border-b border-gray-200">
          <div className="flex items-center">
            <Code className="w-3.5 h-3.5 mr-2 text-blue-700" />
            <span className="font-medium uppercase text-gray-900">{language}</span>
            {isCdk && (
              <span className="ml-4 text-xs font-semibold" style={{ color: isLinting ? '#eab308' : lintStatus && lintStatus !== 'No lint found.' ? '#16a34a' : '#64748b' }}>
                {isLinting ? 'Lint found, fixing...' : lintStatus}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isCdk && !showReview && (
              <button
                onClick={handleCodeTest}
                className="text-blue-700 hover:text-blue-900 transition-colors p-1 rounded hover:bg-blue-50 focus:outline-none focus:ring-1 focus:ring-blue-200 flex items-center gap-1"
                aria-label="Code test"
                disabled={isLinting}
                style={{ fontSize: '12px' }}
              >
                {isLinting ? (
                  <>
                    <span style={{ fontSize: '12px' }}>Code test</span>
                    <Loader2 className="w-3.5 h-3.5 animate-spin ml-1" />
                  </>
                ) : (
                  <span style={{ fontSize: '12px' }}>Code test</span>
                )}
              </button>
            )}
            {isCdk && showReview && (
              <button
                onClick={handleReview}
                className="text-green-700 hover:text-green-900 transition-colors p-1 rounded hover:bg-green-50 focus:outline-none focus:ring-1 focus:ring-green-200"
                aria-label="Review validation results"
              >
                Review
              </button>
            )}
            <button
              onClick={() => handleCopyCode(currentCode)}
              className="text-blue-700 hover:text-green-700 transition-colors p-1 rounded hover:bg-blue-50 focus:outline-none focus:ring-1 focus:ring-blue-200"
              aria-label="Copy code"
            >
              {copiedSnippet === currentCode ? (
                <Check className="w-3.5 h-3.5 text-green-700" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>
                             <Highlight theme={cursorIdeTheme} code={currentCode} language={language}>
          {({ className, style, tokens, getLineProps, getTokenProps }: any) => (
            <pre
              className={className}
              style={{
                ...style,
                margin: 0,
                padding: '12px 16px',
                background: '#fff',
                color: '#111827',
                fontFamily: 'Menlo, Monaco, Courier New, monospace',
                fontSize: 12,
                maxHeight: 400,
                overflow: 'auto',
              }}
            >
              {tokens.map((line: any, i: number) => (
                <div key={i} {...getLineProps({ line, key: i })}>
                  {line.map((token: any, key: number) => {
                    // Bold function/class/variable names
                    const isBold =
                      token.types.includes('function') ||
                      token.types.includes('class-name') ||
                      token.types.includes('variable');
                    return (
                      <span
                        key={key}
                        {...getTokenProps({ token, key })}
                        style={{
                          fontWeight: isBold ? 'bold' : undefined,
                          color: token.color,
                        }}
                      />
                    );
                  })}
                </div>
              ))}
            </pre>
          )}
        </Highlight>
      </div>
    );
  }, [copiedSnippet, handleCopyCode]);

  // Optimize example prompts rendering
  const ExamplePrompts = useMemo(() => {
    // Always show examples if there are no user messages
    if (!showExamples && messages.length > 1) return null;
    
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center px-4">
        <div className="flex items-center justify-center mb-6">
          <h1 className="text-lg font-medium text-center">Enhance your design with Claudio</h1>
        </div>
        <div className="flex flex-col items-center gap-4 w-full max-w-md">
          {randomExamples.map((example, index) => (
            <div key={index} className="w-full">
              <button
                className="w-full text-left border border-gray-900 bg-white p-3 transition-all hover:shadow-[3px_3px_0px_rgba(0,0,0,0.2)] font-light"
                onClick={() => handleExampleClick(example)}
                style={{ borderWidth: '0.3px', fontSize: '15px', fontWeight: 300 }}
              >
                {example}
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }, [showExamples, messages.length, randomExamples, handleExampleClick]);

  // Optimize the rendering of chat messages with windowing for long conversations
  const visibleMessages = useMemo(() => {
    // If there are fewer than 20 messages, just show them all
    if (messages.length <= 20) {
      return messages;
    }
    
    // Otherwise, only show the last 20 messages to avoid rendering too many at once
    return messages.slice(messages.length - 20);
  }, [messages]);

  // Track if we need to show the "Load More" button
  const hasMoreMessages = messages.length > 20;
  
  // Function to load previous messages
  const loadMoreMessages = useCallback(() => {
    // This is a simple implementation - in a real app, you might load messages in chunks
    // For now, we'll just show all messages
    setMessages([...messages]);
  }, [messages]);

  // Memoize the markdown rendering components to prevent unnecessary re-renders
  const markdownComponents = useMemo(() => ({
    code: CodeBlock,
    h1: ({node, ...props}: any) => <h1 className="text-lg font-semibold mt-3 mb-2 text-gray-900 border-b border-gray-200 pb-1" style={{fontSize: '16px', fontWeight: 600}} {...props} />,
    h2: ({node, ...props}: any) => <h2 className="text-base font-semibold mt-3 mb-2 text-gray-800" style={{fontSize: '16px', fontWeight: 600}} {...props} />,
    h3: ({node, ...props}: any) => <h3 className="text-sm font-semibold mt-2 mb-1 text-gray-700" style={{fontSize: '16px', fontWeight: 600}} {...props} />,
    p: ({node, ...props}: any) => <p className="mb-2 leading-relaxed text-gray-700" style={{fontSize: '15px', fontWeight: 400}} {...props} />,
    ul: ({node, ...props}: any) => <ul className="list-disc pl-5 mb-3 space-y-1 text-gray-700" style={{fontSize: '15px', fontWeight: 400}} {...props} />,
    ol: ({node, ...props}: any) => <ol className="list-decimal pl-5 mb-3 space-y-1 text-gray-700" style={{fontSize: '15px', fontWeight: 400}} {...props} />,
    li: ({node, ...props}: any) => <li className="text-sm text-gray-700" style={{fontSize: '15px', fontWeight: 400}} {...props} />,
    a: ({node, ...props}: any) => <a className="text-blue-600 hover:underline transition-colors" style={{fontWeight: 500, fontSize: '15px'}} {...props} />,
    blockquote: ({node, ...props}: any) => <blockquote className="border-l-2 border-blue-300 pl-4 italic my-2 text-gray-600 bg-blue-50 bg-opacity-30 py-1 rounded-sm" style={{fontSize: '15px', fontStyle: 'italic'}} {...props} />,
    table: ({node, ...props}: any) => <div className="overflow-x-auto my-3 rounded border border-black" style={{ borderTopWidth: '0.1px' }}><table className="min-w-full divide-y divide-black" style={{ borderTopWidth: '0.1px', fontSize: '15px' }} {...props} /></div>,
    thead: ({node, ...props}: any) => <thead className="bg-gray-100" {...props} />,
    tbody: ({node, ...props}: any) => <tbody className="divide-y divide-black" style={{ borderTopWidth: '0.1px' }} {...props} />,
    th: ({node, ...props}: any) => <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider" style={{fontWeight: 600, fontSize: '16px'}} {...props} />,
    td: ({node, ...props}: any) => <td className="px-3 py-2 text-sm border-r last:border-r-0 border-black" style={{ borderRightWidth: '0.1px', fontSize: '15px' }} {...props} />,
    tr: ({node, ...props}: any) => <tr className="hover:bg-gray-50 transition-colors" {...props} />,
    strong: ({node, ...props}: any) => <strong className="font-semibold text-gray-800" style={{fontWeight: 600, fontSize: '16px'}} {...props} />,
    em: ({node, ...props}: any) => <em className="italic text-gray-700" style={{fontStyle: 'italic', fontSize: '15px'}} {...props} />,
    hr: ({node, ...props}: any) => <hr className="my-3 border-t border-black" style={{ borderTopWidth: '0.1px' }} {...props} />,
  }), [CodeBlock]);

  // Implement isArchitectureEditCommand to detect edit/add/delete/refactor commands
  const isArchitectureEditCommand = (input: string): boolean => {
    const editCommands = ['edit', 'add', 'delete', 'refactor'];
    return editCommands.some(command => input.toLowerCase().includes(command));
  };

  // Update handleExportCDK to use selected language and backend
  const handleExportCDK = async () => {
    setIsGeneratingCdk(true);
    setCdkDownloadReady(false);
    try {
      const response = await fetch('/api/generate-cdk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ architectureId, language: cdkLanguage }),
      });
      if (!response.ok) throw new Error('Failed to generate CDK');
      setCdkDownloadReady(true);
    } catch (e) {
      alert('Error generating CDK: ' + (e instanceof Error ? e.message : e));
    } finally {
      setIsGeneratingCdk(false);
    }
  };

  // Prompt suggestions for normal mode
  const claudioV01Prompts = [
    "What is a VPC and why do I need one?",
    "Explain the difference between EC2 and Lambda.",
    "How can I make my architecture more secure?",
    "What is the best way to scale my web app?",
    "How do I monitor AWS resources?",
    "What is the cost of running this architecture?",
    "How do I backup my database?",
    "What is the difference between S3 and EBS?",
    "How do I set up CI/CD for my project?",
    "Explain IAM roles and policies."
  ];

  // Randomized 3 prompts for Claudio-V0.1
  const randomClaudioV01Prompts = useMemo(() => {
    const shuffled = [...claudioV01Prompts].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 3);
  }, [messages.length === 0 && selectedModel === 'Claudio-V0.1']);

  // Helper: Deep Analysis loading bar component
  function DeepAnalysisLoadingBar() {
    return (
      <div style={{ display: 'flex', alignItems: 'center', height: 15, width: 200, border: '0.1px solid #d1d5db', borderRadius: 7, padding: '8px 12px', background: '#fff', gap: 10 }}>
        <div style={{ flex: 1, height: 6, background: '#eee', borderRadius: 3, overflow: 'hidden', position: 'relative' }}>
          <div className="deepanalysis-bar-anim" style={{ height: '100%', width: '40%', background: '#111', borderRadius: 3, position: 'absolute', left: 0, animation: 'deepanalysis-bar-move 1.2s linear infinite' }} />
        </div>
        <span style={{ fontSize: 13, color: '#222', marginLeft: 8 }}>Generating document...</span>
        <style>{`
          @keyframes deepanalysis-bar-move {
            0% { left: 0; width: 20%; }
            50% { left: 60%; width: 40%; }
            100% { left: 100%; width: 20%; }
          }
        `}</style>
      </div>
    );
  }

  // Refined Deep Analysis file card
  function DeepAnalysisFileCard({ url, fileName, fileType, onClick }: { url: string, fileName: string, fileType: string, onClick: () => void }) {
    return (
      <div
        className="flex items-center gap-2 border border-gray-300 w-[200px] rounded-md px-3 py-2 bg-white hover:shadow-sm transition cursor-pointer"
        onClick={onClick}
        tabIndex={0}
        role="button"
        style={{ outline: 'none' }}
      >
        <img src={getFileIcon(fileType)} alt={`${fileType} icon`} className="h-[15px] w-[15px]" />
        <span className="text-sm text-gray-800" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{fileName}</span>
      </div>
    );
  }

  // Refined Deep Analysis image card
  function DeepAnalysisImageCard({ src, alt }: { src: string, alt: string }) {
    return (
      <img
        src={src}
        alt={alt}
        style={{ width: 300, height: 300, border: '1px solid #d1d5db', borderRadius: 12, objectFit: 'contain', margin: '12px 0' }}
      />
    );
  }

  // When model changes, reset web search if not Claudio-V0.1
  useEffect(() => {
    if (selectedModel !== 'Claudio-V0.1' && webSearchEnabled) {
      setWebSearchEnabled(false);
    }
  }, [selectedModel]);

  return (
    <div className="flex flex-col h-full claudio-chat-container w-full mx-auto shadow-md overflow-hidden relative bg-white"
      style={{
        height: '100%',
        maxHeight: '100%',
        position: 'relative',
        borderRadius: '0',
        marginBottom: '0',
        width: '800px',
        maxWidth: '100%',
        left: '50%',
        transform: 'translateX(-50%)',
      }}
    >
      {/* No faded grid background */}
      
      {/* Header with white background */}
      <div className="border-b pb-2 px-3 pt-2 flex justify-between items-center bg-white flex-shrink-0 relative z-10 text-gray-800"
        style={{ borderBottom: 'none' }}>
        <div className="flex items-center">
          <div className="flex items-center justify-center h-7 w-7 mr-2">
            <img src="/claudio-logo.png" alt="Claudio" className="w-full h-full object-contain" />
          </div>
          <h3 className="font-medium text-sm text-gray-800">Claudio</h3>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600 font-medium uppercase">
              {detectedCloudProvider}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isLoading && !isAutoscrollEnabled && (
            <button
              onClick={toggleAutoScroll}
              className="flex items-center justify-center h-7 w-7 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
              title={isAutoscrollEnabled ? "Disable auto-scroll" : "Enable auto-scroll"}
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-gray-600" fill="none" stroke="currentColor" strokeWidth="2">
                <path d={isAutoscrollEnabled ? "M19 14l-7 7m0 0l-7-7m7 7V3" : "M5 10l7-7m0 0l7 7m-7-7v18"} />
              </svg>
            </button>
          )}
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={clearConversation}
            className="h-7 w-7 p-0 transition-all flex items-center justify-center text-gray-500 hover:text-gray-800 hover:bg-gray-100"
          >
            <RotateCcw 
              className="h-3 w-3 transition-all duration-300 hover:-rotate-45 transform" 
            />
          </Button>
          {/* Minimize button added here if setIsMinimized is provided */}
          {setIsMinimized && (
            <button
              onClick={() => setIsMinimized(true)}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              title="Minimize Chat"
              style={{ height: '22px', width: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Conditional layout based on whether we have messages or not */}
      {messages.length === 0 ? (
        /* Centered layout when no messages exist */
        <div className="flex-grow flex flex-col items-center justify-center p-4 bg-white" style={{ maxHeight: 'calc(100% - 42px)' }}>
          {/* Example prompts at the top */}
          {selectedModel === 'DeepDesign' && (
            <div className="w-full max-w-3xl mb-8">
              <div className="flex flex-col items-center gap-4 w-full max-w-md mx-auto">
                {randomExamples.map((example, index) => (
                  <div key={index} className="w-full">
                    <button
                      className="w-full text-left border border-gray-900 bg-white p-3 transition-all hover:shadow-[3px_3px_0px_rgba(0,0,0,0.2)] font-light"
                      onClick={() => {
                        setInputValue(example);
                        setShowExamples(false);
                        handleSendMessage();
                      }}
                      style={{ borderWidth: '0.3px', fontSize: '15px', fontWeight: 300 }}
                    >
                      {example}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* Prompt suggestions for Claudio-V0.1 */}
          {selectedModel === 'Claudio-V0.1' && (
            <div className="w-full max-w-3xl mb-8">
              <div className="flex flex-col items-center gap-4 w-full max-w-md mx-auto">
                {randomClaudioV01Prompts.map((example, index) => (
                  <div key={index} className="w-full">
                    <button
                      className="w-full text-left border border-gray-900 bg-white p-3 transition-all hover:shadow-[3px_3px_0px_rgba(0,0,0,0.2)] font-light"
                      onClick={() => {
                        setInputValue(example);
                        setShowExamples(false);
                        handleSendMessage();
                      }}
                      style={{ borderWidth: '0.3px', fontSize: '15px', fontWeight: 300 }}
                    >
                      {example}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* Centered input field, fixed 10px from bottom */}
          <div
            className="chat-input-fadein"
            style={{
              position: 'absolute',
              left: 15,
              right: 15,
              bottom: 15,
              zIndex: 20,
              transition: 'opacity 0.5s',
              opacity: 1,
              padding: 0,
              background: '#fff',
              marginTop: '20px',
              borderRadius: '16px',
            }}
          >
            <ClaudioChatInput
              value={inputValue}
              onChange={setInputValue}
              onSend={handleSendMessage}
              selectedModel={selectedModel}
              onModelChange={setSelectedModel}
              isPrivacyMode={isPrivacyMode}
              onPrivacyChange={setIsPrivacyMode}
              isLoading={isLoading}
              file={file}
              onFileChange={setFile}
              onClearFile={() => setFile(null)}
              glowModelSelector={glowModelSelector}
              webSearchEnabled={webSearchEnabled}
              onWebSearchToggle={setWebSearchEnabled}
            />
          </div>
        </div>
      ) : (
        /* Original layout when messages exist */
        <>
          {/* Messages area with white background */}
          <div 
            className={`flex-grow overflow-y-auto chat-messages-container bg-white relative fadeout-messages ${isLoading && !isAutoscrollEnabled ? 'scroll-indicator' : ''}`}
            style={{
              height: 'calc(100% - 120px)',
              maxHeight: 'calc(100% - 120px)',
              overflow: 'auto',
              flex: '1',
              paddingBottom: '75px',
              fontSize: '15px',
              fontWeight: 400,
              paddingLeft: 20,
              paddingRight: 20,
            }}
            ref={messagesContainerRef}
          >
            {/* Show Load More button if needed */}
            {hasMoreMessages && (
              <div className="flex justify-center mb-4">
                <button 
                  onClick={loadMoreMessages}
                  className="text-xs text-blue-600 bg-blue-50 py-1 px-3 rounded-full hover:bg-blue-100 transition-colors"
                >
                  Load previous messages
                </button>
              </div>
            )}
            {/* Auto-scroll indicator when disabled during generation */}
            {isLoading && !isAutoscrollEnabled && (
              <div 
                className="absolute bottom-4 right-4 bg-white text-blue-600 px-3 py-1.5 rounded-full text-xs shadow-md flex items-center cursor-pointer hover:bg-gray-50 transition-colors border border-gray-200"
                onClick={toggleAutoScroll}
              >
                <span className="mr-1">Auto-scroll disabled</span>
                <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </div>
            )}
            {/* Render visible messages - removed Claudio icon and text */}
            {visibleMessages.map((message) => (
              <div
                key={message.id}
                className={`mb-6 last:mb-2 ${message.role === 'user' ? 'flex justify-end' : ''} relative z-10`}
              >
                <div
                  className={`max-w-[85%] transition-all ${
                    message.role === 'user'
                      ? 'user-message-box'
                      : ''
                  }`}
                  style={
                    message.role === 'user'
                      ? {
                          borderRadius: '15px',
                          background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 60%, rgba(245,245,245,0.85) 100%)', // shiny white glass
                          boxShadow: '0 2px 12px 0 rgba(255,255,255,0.18)',
                          padding: '10px 18px',
                          fontSize: '15px',
                          fontWeight: 400,
                          color: '#111827',
                        }
                      : {}
                  }
                >
                  {message.content === '__DEEPANALYSIS_LOADING__' ? (
                    <DeepAnalysisLoadingBar />
                  ) : message.content === '__DEEPANALYSIS_FILE__' && pendingDownload ? (
                    <DeepAnalysisFileCard url={pendingDownload.url} fileName={pendingDownload.fileName} fileType={pendingDownload.fileType} onClick={() => { const a = document.createElement('a'); a.href = pendingDownload.url; a.download = pendingDownload.fileName; a.click(); }} />
                  ) : message.content === '__DEEPANALYSIS_IMAGE__' && lastImagePreview ? (
                    <DeepAnalysisImageCard src={lastImagePreview} alt="Analysis Result" />
                  ) : message.content ? (
                    <div className={`claudio-markdown text-sm px-3 py-1.5 text-gray-800`}>
                      <MemoizedReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={markdownComponents}
                      >
                        {message.content}
                      </MemoizedReactMarkdown>
                    </div>
                  ) : (
                    <div className="px-3 py-3 text-gray-500 text-sm flex items-center">
                      <span>Thinking...</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {/* Invisible element to scroll to */}
            <div ref={messagesEndRef} />
            {/* Fade-out overlay at the bottom for input field overlap */}
            <div className="chat-fadeout-overlay" />
          </div>
          {/* Input area, fade-in, solid background, 15px from left/right/bottom */}
          <div
            className="chat-input-fadein"
            style={{
              position: 'absolute',
              left: 15,
              right: 15,
              bottom: 15,
              zIndex: 20,
              transition: 'opacity 0.5s',
              opacity: 1,
              padding: 0,
              background: '#fff',
              marginTop: '20px',
              borderRadius: '16px',
            }}
          >
            <ClaudioChatInput
              value={inputValue}
              onChange={setInputValue}
              onSend={handleSendMessage}
              selectedModel={selectedModel}
              onModelChange={setSelectedModel}
              isPrivacyMode={isPrivacyMode}
              onPrivacyChange={setIsPrivacyMode}
              isLoading={isLoading}
              file={file}
              onFileChange={setFile}
              onClearFile={() => setFile(null)}
              glowModelSelector={glowModelSelector}
              webSearchEnabled={webSearchEnabled}
              onWebSearchToggle={setWebSearchEnabled}
            />
          </div>
        </>
      )}
    </div>
  );
} 

{/* Custom styles for the light theme profile loader */}
<style jsx global>{`
  .text-shadow {
    text-shadow: 0 0 10px rgba(255, 255, 255, 0.7);
  }
  
  .profile-loader-light {
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
    border-radius: 50%;
    width: 24px;
    height: 24px;
    border: 1.5px solid transparent;
    border-top-color: #3b82f6;
    border-right-color: rgba(59, 130, 246, 0.3);
    border-bottom-color: rgba(59, 130, 246, 0.3);
    border-left-color: rgba(59, 130, 246, 0.3);
    animation: profile-loader-rotate 1s linear infinite;
  }
  
  @keyframes profile-loader-rotate {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
  
  .scroll-indicator:after {
    background: linear-gradient(to right, #3b82f680, #93c5fd80, #3b82f680);
  }
  
  .animating-text {
    border-right: 2px solid #3b82f6;
  }
  
  /* Input field container styling */
  .relative {
    position: relative;
  }
  
  textarea {
    transition: all 0.2s ease-in-out;
  }
  
  textarea:hover {
    box-shadow: 3px 3px 0px rgba(0,0,0,0.2);
  }
  
  textarea:focus {
    border-color: #111827; /* gray-900 */
    box-shadow: 3px 3px 0px rgba(0,0,0,0.2);
  }
  
  /* Remove all component borders */
  .claudio-chat-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100% !important;
    max-height: 100% !important;
    margin-bottom: 0 !important;
    background-color: white;
    border: 0.3px solid #374151 !important;
    border-radius: 0 !important;
    overflow: hidden;
    position: relative;
  }
  
  .claudio-chat-container * {
    border-radius: 0 !important;
  }
  
  /* Restore border radius for specific components that should keep it */
  .profile-loader-light {
    border-radius: 50% !important;
  }
  
  input[type="checkbox"],
  button.group {
    border-radius: 9999px !important; 
  }
  
  /* Make the Claudio Chat container fully adaptive */
  @media (max-width: 1200px) {
    .claudio-chat-container {
      width: 100%;
      max-width: none;
      border-left: 0.3px solid #374151 !important;
      border-right: 0.3px solid #374151 !important;
      height: 100%;
    }
  }
  
  /* Recommendation button styling - refined */
  .recommendation-button {
    padding: 0.1em 0.25em;
    width: 13em;
    height: 4.2em;
    background-color: #212121;
    border: 0.08em solid #fff;
    border-radius: 0.3em;
    font-size: 12px;
    cursor: pointer;
    position: relative;
    overflow: visible;
  }

  .recommendation-button span {
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
    bottom: 0.4em;
    width: 12em;
    height: 2.5em;
    background-color: #212121;
    border-radius: 0.2em;
    font-size: 0.9em;
    color: #fff;
    border: 0.08em solid #fff;
    box-shadow: 0 0.4em 0.1em 0.019em #fff;
    text-align: center;
    padding: 0.5em;
    margin: 0 auto;
    line-height: 1.2;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .recommendation-button span:hover {
    transition: all 0.5s;
    transform: translate(0, 0.4em);
    box-shadow: 0 0 0 0 #fff;
  }

  .recommendation-button span:not(:hover) {
    transition: all 1s;
  }

  /* Update the chat-messages-container to use more of the available height */
  .chat-messages-container {
    min-height: unset !important;
    height: calc(100% - 120px) !important;
    max-height: calc(100% - 120px) !important;
    flex: 1 !important;
    overflow-y: auto !important;
    overflow-x: hidden;
    scrollbar-width: thin;
    scrollbar-color: rgba(0, 0, 0, 0.2) transparent;
    position: relative;
  }

  /* Ensure large screens maintain fixed height */
  @media (min-width: 1024px) {
    .claudio-chat-container {
      height: 100% !important;
      max-height: 100% !important;
      position: relative;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    
    .chat-messages-container {
      flex: 1 !important;
      height: calc(100% - 120px) !important;
      max-height: calc(100% - 120px) !important;
      overflow-y: auto !important;
    }
  }

  /* Code block styling with thin black borders */
  .claudio-markdown pre {
    border: 0.1px solid black !important;
    border-radius: 3px !important;
    overflow: hidden;
  }
  
  .claudio-markdown code {
    font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
  }
  
  .claudio-markdown p code {
    border: 0.1px solid black;
    background-color: rgba(0, 0, 0, 0.03);
    padding: 0.1em 0.3em;
    border-radius: 3px;
  }
  
  /* Ensure borders appear properly on all code-related elements */
  .claudio-markdown table,
  .claudio-markdown th,
  .claudio-markdown td {
    border-color: black;
    border-width: 0.1px;
  }

  .model-selector-glow {
    box-shadow: 0 0 0 4px rgba(255,255,255,0.7), 0 0 16px 8px rgba(255,255,255,0.3);
    background: linear-gradient(120deg, rgba(255,255,255,0.7) 40%, rgba(255,255,255,0.2) 100%);
    animation: glass-glow 2s ease-in-out;
  }
  @keyframes glass-glow {
    0% { box-shadow: 0 0 0 0 rgba(255,255,255,0.0), 0 0 0 0 rgba(255,255,255,0.0); }
    30% { box-shadow: 0 0 0 4px rgba(255,255,255,0.7), 0 0 16px 8px rgba(255,255,255,0.3); }
    70% { box-shadow: 0 0 0 4px rgba(255,255,255,0.7), 0 0 16px 8px rgba(255,255,255,0.3); }
    100% { box-shadow: 0 0 0 0 rgba(255,255,255,0.0), 0 0 0 0 rgba(255,255,255,0.0); }
  }

  .cb-prettier {
    color: #111827;
    font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
    font-size: 13px;
    background: #fff;
  }
  .cb-keyword {
    color: #1e40af !important;
    font-weight: 600 !important;
  }
  .cb-string {
    color: #166534 !important;
  }
  .cb-number {
    color: #b45309 !important;
  }
  .cb-comment {
    color: #6b7280 !important;
    font-style: italic !important;
  }
  .cb-variable {
    color: #0d9488 !important;
    font-weight: bold !important;
  }
  .cb-function {
    color: #be185d !important;
    font-weight: bold !important;
  }
  .cb-class {
    color: #7c3aed !important;
    font-weight: bold !important;
  }
  .chat-input-fadein {
    opacity: 0;
    animation: fadeInInput 0.7s 0.2s forwards;
  }
  @keyframes fadeInInput {
    from { opacity: 0; transform: translateY(30px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .chat-fadeout-overlay {
    pointer-events: none;
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 60px;
    background: linear-gradient(to bottom, rgba(255,255,255,0) 0%, #fff 90%);
    z-index: 10;
  }
`}</style>