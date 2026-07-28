"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { SendIcon, Loader2 } from "lucide-react";

export type PromptInputProps = React.FormHTMLAttributes<HTMLFormElement> & {
  onSubmit?: (e: React.FormEvent<HTMLFormElement>) => void;
};

export const PromptInput = ({ className, onSubmit, children, ...props }: PromptInputProps) => (
  <form
    className={cn("flex flex-col gap-2 p-2", className)}
    onSubmit={(e) => {
      e.preventDefault();
      onSubmit?.(e);
    }}
    {...props}
  >
    {children}
  </form>
);

export type PromptInputTextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const PromptInputTextarea = ({ className, onKeyDown, ...props }: PromptInputTextareaProps) => (
  <Textarea
    rows={2}
    className={cn("resize-none min-h-[44px] max-h-40", className)}
    onKeyDown={(e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        (e.currentTarget.form as HTMLFormElement | null)?.requestSubmit();
      }
      onKeyDown?.(e);
    }}
    {...props}
  />
);

export const PromptInputFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex items-center justify-between gap-2", className)} {...props} />
);

export const PromptInputTools = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex items-center gap-1", className)} {...props} />
);

export type PromptInputButtonProps = React.ComponentProps<typeof Button>;

export const PromptInputButton = ({ className, variant = "ghost", size = "icon", ...props }: PromptInputButtonProps) => (
  <Button type="button" variant={variant} size={size} className={cn("h-8 w-8", className)} {...props} />
);

export type PromptInputSubmitProps = React.ComponentProps<typeof Button> & {
  status?: "submitted" | "streaming" | "ready" | "error" | string;
};

export const PromptInputSubmit = ({ className, status, children, ...props }: PromptInputSubmitProps) => {
  const loading = status === "submitted" || status === "streaming";
  return (
    <Button type="submit" size="icon" className={cn("h-8 w-8", className)} {...props}>
      {children ?? (loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendIcon className="h-4 w-4" />)}
    </Button>
  );
};
