"use client";

import * as React from "react";
import { Copy, Check } from "lucide-react";
import { useToast } from "@/components/shared/use-toast";
import { cn } from "@/lib/utils";

interface CopyContactButtonProps {
  value: string;
  type: "phone" | "email";
  label?: string;
  className?: string;
}

export function CopyContactButton({
  value,
  type,
  label,
  className,
}: CopyContactButtonProps) {
  const { toast } = useToast();
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast({
        title: type === "phone" ? "Phone Number Copied" : "Email Address Copied",
        description: value,
        variant: "gold",
        duration: 3500,
      });
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast({
        title: "Could not copy",
        description: `Please copy ${value} manually.`,
        variant: "warning",
      });
    }
  };

  const defaultTitle = type === "phone" ? "Copy Phone Number" : "Copy Email Address";

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={cn(
        "p-3 rounded-xl transition-colors cursor-pointer",
        "bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 hover:text-slate-950",
        "dark:bg-white/5 dark:hover:bg-white/10 dark:border-white/15 dark:text-slate-300 dark:hover:text-white",
        className
      )}
      title={label || defaultTitle}
      aria-label={label || defaultTitle}
    >
      {copied ? (
        <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
      ) : (
        <Copy className="w-4 h-4 text-gold-700 dark:text-gold-400" />
      )}
    </button>
  );
}

export default CopyContactButton;
