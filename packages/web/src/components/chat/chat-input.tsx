"use client"

import { useRef, useImperativeHandle, forwardRef } from "react"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { SendIcon, SquareIcon } from "lucide-react"

interface ChatInputProps {
  onSend?: (message: string) => void
  onStop?: () => void
  disabled?: boolean
  isLoading?: boolean
  value?: string
  onChange?: (value: string) => void
}

export interface ChatInputRef {
  focus: () => void
}

export const ChatInput = forwardRef<ChatInputRef, ChatInputProps>(function ChatInput({
  onSend,
  onStop,
  disabled = false,
  isLoading = false,
  value,
  onChange,
}, ref) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useImperativeHandle(ref, () => ({
    focus: () => textareaRef.current?.focus(),
  }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (value?.trim() && onSend) {
      onSend(value.trim())
      onChange?.("")
      if (textareaRef.current) {
        textareaRef.current.style.height = "28px"
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange?.(e.target.value)
    e.target.style.height = "28px"
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col">
      <div className="flex items-end">
        <div className="flex flex-1 items-center py-1.5">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder="Describe a diagram..."
            rows={1}
            className="flex-1 resize-none overflow-hidden bg-transparent pl-3 text-sm leading-7 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none"
            style={{ height: "28px" }}
            disabled={disabled}
          />
        </div>

        <div className="flex shrink-0 items-center gap-0.5 pb-1 pr-1">
          {isLoading ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  size="icon"
                  className="h-8 w-8 rounded-full bg-red-500 text-white hover:bg-red-600"
                  onClick={onStop}
                >
                  <SquareIcon className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Stop</TooltipContent>
            </Tooltip>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="submit"
                  size="icon"
                  className="h-8 w-8 rounded-full text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] disabled:text-[var(--text-muted)]/50"
                  variant="ghost"
                  disabled={disabled || !value?.trim()}
                >
                  <SendIcon className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Send Message</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </form>
  )
})
