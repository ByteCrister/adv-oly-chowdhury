"use client";

import * as React from "react";
import { Copy, Check } from "lucide-react";
import { useToast } from "@/components/shared/use-toast";
import { cn } from "@/lib/utils";

interface CopyAddressButtonProps {
  fullAddress: string;
  className?: string;
}

export function CopyAddressButton({ fullAddress, className }: CopyAddressButtonProps) {
  const { toast } = useToast();
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullAddress);
      setCopied(true);
      toast({
        title: "Chamber Address Copied",
        description: fullAddress,
        variant: "gold",
        duration: 4000,
      });
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast({
        title: "Could not copy",
        description: "Please copy the address manually.",
        variant: "warning",
      });
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={cn(
        "px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer",
        "bg-slate-100 hover:bg-slate-200 text-slate-800 hover:text-slate-950 border border-slate-300",
        "dark:bg-white/10 dark:hover:bg-white/15 dark:text-slate-100 dark:hover:text-white dark:border-white/20",
        className
      )}
      title="Copy full address"
      aria-label="Copy full chamber address"
    >
      {copied ? (
        <>
          <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Copied</span>
        </>
      ) : (
        <>
          <Copy className="w-3.5 h-3.5 text-gold-700 dark:text-gold-400" />
          <span>Copy</span>
        </>
      )}
    </button>
  );
}

export default CopyAddressButton;
