import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Check, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface CopyButtonProps {
  text: string;
  className?: string;
  /** Optional visible label rendered next to the icon (e.g. "Copy faircoin.conf"). */
  label?: string;
  /** Keep the button icon-only while still using `label` for the accessible name. */
  hideLabel?: boolean;
}

export function CopyButton({ text, className, label, hideLabel = false }: CopyButtonProps) {
  const [copied, setCopied] = React.useState(false);
  const showLabel = Boolean(label) && !hideLabel;

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Failed to copy');
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size={showLabel ? 'sm' : 'icon'}
      aria-label={label ?? 'Copy'}
      onClick={onCopy}
      className={cn(showLabel && 'gap-2', className)}
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      {showLabel ? <span>{label}</span> : null}
    </Button>
  );
}
