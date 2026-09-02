"use client";

import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

export type MessageProps = HTMLAttributes<HTMLDivElement> & {
  from?: "user" | "assistant" | "system";
};

export const Message = ({ className, from = "assistant", ...props }: MessageProps) => (
  <div
    data-from={from}
    className={cn(
      "group/message flex w-full gap-3 py-2",
      from === "user" ? "justify-end" : "justify-start",
      className,
    )}
    {...props}
  />
);

export type MessageContentProps = HTMLAttributes<HTMLDivElement>;

export const MessageContent = ({ className, ...props }: MessageContentProps) => (
  <div
    className={cn(
      "max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed",
      "bg-muted/50 group-data-[from=user]/message:bg-primary group-data-[from=user]/message:text-primary-foreground",
      className,
    )}
    {...props}
  />
);

export type MessageResponseProps = HTMLAttributes<HTMLDivElement> & {
  children?: string;
};

export const MessageResponse = ({ className, children, ...props }: MessageResponseProps) => {
  if (typeof children !== "string") {
    return (
      <div className={cn("whitespace-pre-wrap break-words", className)} {...props}>
        {children}
      </div>
    );
  }

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  // Match [text](url)
  const regex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match;

  while ((match = regex.exec(children)) !== null) {
    if (match.index > lastIndex) {
      parts.push(children.substring(lastIndex, match.index));
    }
    parts.push(
      <a
        key={match.index}
        href={match[2]}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
      >
        {match[1]}
      </a>
    );
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < children.length) {
    parts.push(children.substring(lastIndex));
  }

  return (
    <div className={cn("whitespace-pre-wrap break-words", className)} {...props}>
      {parts.length > 0 ? parts : children}
    </div>
  );
};

export type MessageAvatarProps = HTMLAttributes<HTMLDivElement> & {
  src?: string;
  name?: string;
};

export const MessageAvatar = ({ className, name, ...props }: MessageAvatarProps) => (
  <div
    className={cn(
      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-medium",
      className,
    )}
    {...props}
  >
    {name?.slice(0, 1).toUpperCase() ?? "A"}
  </div>
);
