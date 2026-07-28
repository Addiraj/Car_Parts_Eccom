"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CheckIcon, CopyIcon } from "lucide-react";
import type { ComponentProps, HTMLAttributes } from "react";
import { useState } from "react";

export type CodeBlockProps = HTMLAttributes<HTMLDivElement> & {
  code: string;
  language?: string;
  showLineNumbers?: boolean;
};

export const CodeBlock = ({
  code,
  language,
  className,
  ...props
}: CodeBlockProps) => {
  return (
    <div
      className={cn(
        "not-prose relative w-full overflow-hidden rounded-md border bg-muted/40",
        className,
      )}
      {...props}
    >
      {language ? (
        <div className="border-b px-3 py-1 text-[10px] font-mono uppercase text-muted-foreground">
          {language}
        </div>
      ) : null}
      <pre className="overflow-x-auto p-3 text-xs leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
};

export type CodeBlockCopyButtonProps = ComponentProps<typeof Button> & {
  code: string;
};

export const CodeBlockCopyButton = ({
  code,
  className,
  ...props
}: CodeBlockCopyButtonProps) => {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn("h-7 w-7", className)}
      onClick={() => {
        navigator.clipboard.writeText(code).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      {...props}
    >
      {copied ? <CheckIcon className="h-3.5 w-3.5" /> : <CopyIcon className="h-3.5 w-3.5" />}
    </Button>
  );
};
