"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Share2, Check, Copy } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface CopyButtonProps {
    value: string;
    label?: string;
    successLabel?: string;
    className?: string;
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
    size?: "default" | "sm" | "lg" | "icon";
}

export function CopyButton({
    value,
    label = "Share Profile",
    successLabel = "Copied!",
    className,
    variant = "outline",
    size = "sm",
}: CopyButtonProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error("Failed to copy!", err);
        }
    };

    return (
        <Button
            variant={variant}
            size={size}
            className={cn(
                "rounded-xl gap-2 active:scale-95 transition-all overflow-hidden relative",
                copied ? "border-green-500/50 bg-green-500/10" : "border-primary/20",
                className
            )}
            onClick={handleCopy}
            disabled={copied}
        >
            <AnimatePresence mode="wait">
                {copied ? (
                    <motion.div
                        key="copied"
                        initial={{ y: 10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -10, opacity: 0 }}
                        className="flex items-center gap-2"
                    >
                        <Check className="h-4 w-4 text-green-500" />
                        <span className="text-green-500 font-bold">{successLabel}</span>
                    </motion.div>
                ) : (
                    <motion.div
                        key="copy"
                        initial={{ y: 10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -10, opacity: 0 }}
                        className="flex items-center gap-2"
                    >
                        <Share2 className="h-4 w-4" />
                        <span>{label}</span>
                    </motion.div>
                )}
            </AnimatePresence>
        </Button>
    );
}
