import React from 'react';
import { Button } from "@/components/ui/button";
import { 
  X, 
  Code,
  FileCode,
  CheckCircle2
} from 'lucide-react';

interface LanguageOption {
  value: string;
  label: string;
  icon: JSX.Element;
  description: string;
}

interface LanguageSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (language: string) => void;
}

export default function LanguageSelectModal({ 
  isOpen, 
  onClose, 
  onSelect 
}: LanguageSelectModalProps) {
  if (!isOpen) return null;

  const languages: LanguageOption[] = [
    {
      value: 'typescript',
      label: 'TypeScript',
      icon: <FileCode className="h-6 w-6 text-black" />,
      description: 'Strongly typed JavaScript with full AWS CDK support'
    },
    {
      value: 'javascript',
      label: 'JavaScript',
      icon: <FileCode className="h-6 w-6 text-black" />,
      description: 'Dynamic language with wide adoption and AWS CDK support'
    },
    {
      value: 'python',
      label: 'Python',
      icon: <FileCode className="h-6 w-6 text-black" />,
      description: 'Easy to read syntax with AWS CDK support'
    },
    {
      value: 'java',
      label: 'Java',
      icon: <FileCode className="h-6 w-6 text-black" />,
      description: 'Enterprise-grade language with AWS CDK support'
    },
    {
      value: 'csharp',
      label: 'C#',
      icon: <FileCode className="h-6 w-6 text-black" />,
      description: '.NET language with strong AWS integration'
    }
  ];

  const handleLanguageSelect = (language: string) => {
    onSelect(language);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white border border-black w-full max-w-lg max-h-[90vh] overflow-auto" style={{ borderWidth: '0.1px' }}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-black p-4" style={{ borderBottomWidth: '0.1px' }}>
          <div className="flex items-center space-x-2">
            <Code className="h-5 w-5 text-black" />
            <h2 className="text-lg font-medium">Select CDK Language</h2>
          </div>
          <button
            onClick={onClose}
            className="text-black hover:text-black focus:outline-none"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-4">
          <p className="text-sm text-black mb-4">
            Choose the programming language for your AWS CDK code. Your architecture will be converted
            to infrastructure as code in your preferred language.
          </p>
          
          <div className="space-y-2">
            {languages.map((lang) => (
              <button
                key={lang.value}
                onClick={() => handleLanguageSelect(lang.value)}
                className="w-full text-left p-3 border border-black hover:shadow-[3px_3px_0px_rgba(0,0,0,0.2)] transition-all group flex items-start space-x-3"
                style={{ borderWidth: '0.1px' }}
              >
                <div className="mt-0.5">{lang.icon}</div>
                <div className="flex-grow">
                  <div className="font-medium text-black">{lang.label}</div>
                  <div className="text-sm text-black">{lang.description}</div>
                </div>
                <div className="opacity-0 group-hover:opacity-100">
                  <CheckCircle2 className="h-5 w-5 text-black" />
                </div>
              </button>
            ))}
          </div>
        </div>
        
        {/* Footer */}
        <div className="border-t border-black p-4 bg-white flex justify-end" style={{ borderTopWidth: '0.1px' }}>
          <button 
            onClick={onClose} 
            className="mr-2 py-2 px-4 border border-black text-black bg-white hover:shadow-[3px_3px_0px_rgba(0,0,0,0.2)] focus:outline-none"
            style={{ borderWidth: '0.1px' }}
          >
            Cancel
          </button>
          <button 
            onClick={() => handleLanguageSelect('typescript')}
            className="py-2 px-4 bg-white text-black border border-black hover:shadow-[3px_3px_0px_rgba(0,0,0,0.2)] focus:outline-none"
            style={{ borderWidth: '0.1px' }}
          >
            Use TypeScript (Default)
          </button>
        </div>
      </div>
    </div>
  );
} 