"use client";

import {
    Plus,
    File,
    Camera,
    X,
    ArrowRight,
    Brain,
    ChevronDown,
    Lock,
    Unlock,
    Globe,
} from "lucide-react";
import { useState, useRef, useCallback, type RefObject } from "react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useAutoResizeTextarea } from "@/hooks/use-auto-resize-textarea";
import { useFileInput } from "@/hooks/use-file-input";
import { useClickOutside } from "@/hooks/use-click-outside";

const AI_MODELS = [
    { name: "Claudio-V0.1" },
    { name: "DeepDesign"},
    { name: "Deep Analysis" },
].map((model) => ({ ...model, icon: <Brain className="w-3 h-4" /> }));

const FileDisplay = ({
    fileName,
    onClear,
}: {
    fileName: string;
    onClear: () => void;
}) => (
    <div className="flex items-center gap-2 bg-black/5 dark:bg-white/5 w-fit px-3 py-1 rounded-lg">
        <File className="w-4 h-4 dark:text-white" />
        <span className="text-sm dark:text-white">{fileName}</span>
        <button
            type="button"
            onClick={onClear}
            className="ml-1 p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10"
        >
            <X className="w-3 h-3 dark:text-white" />
        </button>
    </div>
);

interface ClaudioChatInputProps {
    value: string;
    onChange: (v: string) => void;
    onSend: () => void;
    selectedModel: string;
    onModelChange: (model: string) => void;
    isPrivacyMode: boolean;
    onPrivacyChange: (v: boolean) => void;
    isLoading: boolean;
    file: File | null;
    onFileChange: (file: File | null) => void;
    onClearFile: () => void;
    glowModelSelector?: boolean;
    webSearchEnabled: boolean;
    onWebSearchToggle: (enabled: boolean) => void;
}

export default function ClaudioChatInput({ value, onChange, onSend, selectedModel, onModelChange, isPrivacyMode, onPrivacyChange, isLoading, file, onFileChange, onClearFile, glowModelSelector, webSearchEnabled, onWebSearchToggle }: ClaudioChatInputProps) {
    const menuRef = useRef<HTMLDivElement>(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
    const { textareaRef, adjustHeight } = useAutoResizeTextarea({ minHeight: 40, maxHeight: 200 });
    const { fileInputRef, handleFileSelect: baseHandleFileSelect, clearFile: baseClearFile } = useFileInput({ accept: "image/*", maxSize: 5 });
    useClickOutside(menuRef as RefObject<HTMLElement>, () => {
        if (isMenuOpen) setIsMenuOpen(false);
        if (isModelMenuOpen) setIsModelMenuOpen(false);
    });
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        baseHandleFileSelect(e);
        const file = e.target.files?.[0] || null;
        onFileChange(file);
    };
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (value.trim() || file) {
                onSend();
                adjustHeight(true);
            }
        }
    };
    return (
        <div className="w-full py-4">
            <div className="rounded-xl bg-black/5 dark:bg-white/5">
                <div ref={menuRef}>
                    <div className="border-b border-black/10 dark:border-white/10">
                        <div className="flex justify-between items-center px-4 py-2 text-sm text-zinc-600 dark:text-zinc-400">
                            <div className="relative flex items-center" data-model-menu>
                                <button
                                    type="button"
                                    onClick={() => setIsModelMenuOpen(!isModelMenuOpen)}
                                    className={cn(
                                        "flex items-center gap-1.5 hover:bg-black/5 dark:hover:bg-white/5 rounded-[10px] px-2 py-1 border border-black/10 dark:border-white/10 transition-colors",
                                        glowModelSelector && "model-selector-glow"
                                    )}
                                    style={{ borderRadius: 10, height: 36 }}
                                >
                                    <Brain className="w-4 h-4 dark:text-white" />
                                    <span className="dark:text-white">{selectedModel}</span>
                                    <ChevronDown className="w-3 h-3 ml-0.5 dark:text-white" />
                                </button>
                                <div style={{ width: 8, minWidth: 8 }} />
                                <button
                                    type="button"
                                    className={cn(
                                        "flex items-center gap-1.5 px-2 py-1 border rounded-[10px] transition-all duration-200",
                                        webSearchEnabled && selectedModel === 'Claudio-V0.1'
                                            ? "bg-white text-blue-600 border-transparent border-gradient-blue"
                                            : "bg-transparent text-black dark:text-white border-black/10 dark:border-white/10",
                                        !webSearchEnabled && selectedModel === 'Claudio-V0.1' && "hover:bg-white hover:text-blue-600 hover:border-transparent hover:border-gradient-blue"
                                    )}
                                    style={{
                                        borderRadius: 10,
                                        borderWidth: 0.1,
                                        height: 36,
                                        borderImage: webSearchEnabled && selectedModel === 'Claudio-V0.1'
                                            ? 'linear-gradient(90deg, #3b82f6, #60a5fa, #3b82f6) 1'
                                            : undefined,
                                        borderImageSlice: webSearchEnabled && selectedModel === 'Claudio-V0.1' ? 1 : undefined,
                                        borderStyle: 'solid',
                                        borderColor: webSearchEnabled && selectedModel === 'Claudio-V0.1' ? 'transparent' : undefined
                                    }}
                                    onClick={() => onWebSearchToggle(!webSearchEnabled)}
                                    disabled={selectedModel !== 'Claudio-V0.1'}
                                    title="Enable web search (Claudio-V0.1 only)"
                                >
                                    <Globe className={cn("w-4 h-4 transition-all duration-200", webSearchEnabled && selectedModel === 'Claudio-V0.1' ? "text-blue-600" : "text-black dark:text-white", !webSearchEnabled && selectedModel === 'Claudio-V0.1' && "hover:text-blue-600")}/>
                                    <span className={cn("text-xs font-medium transition-all duration-200", webSearchEnabled && selectedModel === 'Claudio-V0.1' ? "text-blue-600" : "text-black dark:text-white", !webSearchEnabled && selectedModel === 'Claudio-V0.1' && "hover:text-blue-600")}>Search</span>
                                </button>
                            </div>
                            <button
                                type="button"
                                onClick={() => onPrivacyChange(!isPrivacyMode)}
                                className={cn(
                                    "flex items-center gap-2 p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5",
                                    isPrivacyMode ? "text-green-600" : "text-zinc-600 dark:text-zinc-400"
                                )}
                            >
                                {isPrivacyMode ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                                <span>Privacy</span>
                            </button>
                        </div>
                    </div>
                    {file && (
                        <div className="px-4 pt-2">
                            <FileDisplay
                                fileName={file.name}
                                onClear={onClearFile}
                            />
                        </div>
                    )}
                    <div className="relative px-2 py-2">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2" data-action-menu>
                            <button
                                type="button"
                                onClick={() => setIsMenuOpen(!isMenuOpen)}
                                className="rounded-3xl bg-black/5 dark:bg-white/5 p-2 hover:bg-black/10 dark:hover:bg-white/10"
                            >
                                <Plus className="w-4 h-4 dark:text-white" />
                            </button>
                            {isMenuOpen && (
                                <div className="absolute left-0 top-full mt-1 bg-white dark:bg-zinc-800 rounded-md shadow-lg py-1 min-w-[140px] z-50 border border-black/10 dark:border-white/10">
                                    {[
                                        { icon: File, label: "Upload File", onClick: () => fileInputRef.current?.click() },
                                        { icon: Camera, label: "Take Photo" },
                                    ].map(({ icon: Icon, label, onClick }) => (
                                        <button
                                            type="button"
                                            key={label}
                                            onClick={onClick}
                                            className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/5 text-sm transition-colors dark:text-white"
                                        >
                                            <Icon className="w-4 h-4 dark:text-white" />
                                            <span>{label}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <Textarea
                            id="ai-input-10"
                            ref={textareaRef}
                            value={value}
                            placeholder="Type your message..."
                            className={cn(
                                "w-full rounded-xl pl-14 pr-10 border-none resize-none bg-transparent dark:text-white placeholder:text-black/70 dark:placeholder:text-white/70",
                                "min-h-[40px] max-h-[200px]"
                            )}
                            style={{ overflow: 'hidden' }}
                            onKeyDown={handleKeyDown}
                            onChange={(e) => {
                                onChange(e.target.value);
                                adjustHeight();
                            }}
                        />
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleFileSelect}
                        />
                        <button
                            type="button"
                            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl bg-black/5 dark:bg-white/5 p-1"
                            onClick={() => {
                                if (value.trim() || file) {
                                    onSend();
                                    adjustHeight(true);
                                }
                            }}
                            disabled={isLoading || (!value.trim() && !file)}
                        >
                            <ArrowRight
                                className={cn(
                                    "w-4 h-4 dark:text-white",
                                    value ? "opacity-100" : "opacity-30"
                                )}
                            />
                        </button>
                    </div>
                    {isModelMenuOpen && (
                        <div
                            className="absolute bottom-full left-0 mb-1 bg-white dark:bg-zinc-800 rounded-md shadow-lg py-1 z-50 border border-black/10 dark:border-white/10"
                            style={{ borderRadius: '5px', width: '170px', userSelect: 'none', pointerEvents: 'auto' }}
                            draggable={false}
                            tabIndex={-1}
                            onBlur={() => setIsModelMenuOpen(false)}
                        >
                            {AI_MODELS.map((model) => (
                                <button
                                    type="button"
                                    key={model.name}
                                    className="w-full px-3 py-1.5 text-left hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-2 text-sm transition-colors dark:text-white"
                                    onClick={() => { onModelChange(model.name); setIsModelMenuOpen(false); }}
                                    draggable={false}
                                    style={{ userSelect: 'none', pointerEvents: 'auto' }}
                                >
                                    <div className="flex items-center gap-2 flex-1" draggable={false} style={{ userSelect: 'none', pointerEvents: 'auto' }}>
                                        {model.icon}
                                        <span>{model.name}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
} 