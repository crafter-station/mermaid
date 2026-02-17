"use client"

import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { useRef, useEffect, useState, useMemo, useCallback, useImperativeHandle, forwardRef } from "react"
import { ChatInput, type ChatInputRef } from "./chat-input"
import { ChatMessages } from "./chat-messages"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Trash2Icon, ChevronDownIcon } from "lucide-react"

const AI_MODELS = [
  { id: "openai/gpt-oss-120b", label: "GPT OSS 120B" },
  { id: "openai/gpt-5-mini", label: "GPT-5 Mini" },
  { id: "alibaba/qwen-3-32b", label: "Qwen 3 32B" },
] as const

export interface ChatPanelRef {
  focusInput: () => void
}

interface ChatPanelProps {
  source: string
  onSourceChange: (newSource: string) => void
}

export const ChatPanel = forwardRef<ChatPanelRef, ChatPanelProps>(function ChatPanel({ source, onSourceChange }, ref) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<ChatInputRef>(null)
  const [input, setInput] = useState("")
  const [modelId, setModelId] = useState<string>(AI_MODELS[0].id)

  useImperativeHandle(ref, () => ({
    focusInput: () => inputRef.current?.focus(),
  }))

  const sourceRef = useRef(source)
  useEffect(() => {
    sourceRef.current = source
  }, [source])

  const modelRef = useRef(modelId)
  useEffect(() => {
    modelRef.current = modelId
  }, [modelId])

  const transport = useMemo(() => new DefaultChatTransport({
    api: "/api/chat",
    prepareSendMessagesRequest({ id, messages }) {
      return {
        body: {
          id,
          messages,
          diagramSource: sourceRef.current,
          model: modelRef.current,
        },
      }
    },
  }), [])

  // Track auto-send count to prevent infinite loops
  const autoSendCountRef = useRef(0)

  const {
    messages,
    sendMessage,
    setMessages,
    status,
    stop,
    addToolResult,
  } = useChat({
    transport,
    sendAutomaticallyWhen({ messages: msgs }) {
      const lastMessage = msgs[msgs.length - 1]
      if (!lastMessage || lastMessage.role !== "assistant") return false
      const toolParts = lastMessage.parts.filter(
        (p) => p.type.startsWith("tool-") || p.type === "dynamic-tool"
      ) as Array<{ type: string; state?: string }>
      if (toolParts.length === 0) return false
      const allDone = toolParts.every(
        (p) => p.state === "output-available" || p.state === "output-error"
      )
      if (!allDone) return false

      // Limit auto-sends to prevent infinite loops
      if (autoSendCountRef.current >= 3) return false
      autoSendCountRef.current++
      return true
    },
    onToolCall: async ({ toolCall }) => {
      const currentSource = sourceRef.current

      // Strip markdown code fences if the AI accidentally includes them
      function stripFences(code: string): string {
        return code.replace(/^```(?:mermaid)?\s*\n?/i, "").replace(/\n?```\s*$/, "")
      }

      // Parse-check diagram and return error string if invalid, null if valid
      function parseCheck(diagramCode: string): string | null {
        try {
          if (typeof window !== "undefined" && window.crafterMermaid) {
            const result = window.crafterMermaid.parse(diagramCode)
            if (!result.ast) return "Parse error: invalid mermaid syntax"
          }
          return null
        } catch (e) {
          return `Parse error: ${e instanceof Error ? e.message : "invalid mermaid syntax"}`
        }
      }

      if (toolCall.toolName === "setDiagram") {
        const { content } = toolCall.input as { content: string }
        const cleanContent = stripFences(content)
        const parseError = parseCheck(cleanContent)
        if (parseError) {
          addToolResult({
            tool: "setDiagram" as never,
            toolCallId: toolCall.toolCallId,
            output: { success: false, message: `${parseError}. Fix the syntax and try again. Remember: only raw mermaid syntax, no \`\`\`mermaid fences.` } as never,
          })
          return
        }
        onSourceChange(cleanContent)
        addToolResult({
          tool: "setDiagram" as never,
          toolCallId: toolCall.toolCallId,
          output: { success: true, message: "Diagram updated" } as never,
        })
        return
      }

      if (toolCall.toolName === "editDiagram") {
        const { oldText, newText } = toolCall.input as {
          oldText: string
          newText: string
        }

        if (!currentSource.includes(oldText)) {
          addToolResult({
            tool: "editDiagram" as never,
            toolCallId: toolCall.toolCallId,
            output: {
              success: false,
              message: `Could not find text to replace: "${oldText.slice(0, 80)}..."`,
            } as never,
          })
          return
        }

        const newContent = currentSource.replace(oldText, newText)
        const parseError = parseCheck(newContent)
        if (parseError) {
          addToolResult({
            tool: "editDiagram" as never,
            toolCallId: toolCall.toolCallId,
            output: { success: false, message: `${parseError}. The edit produced invalid syntax. Fix it and try again.` } as never,
          })
          return
        }
        onSourceChange(newContent)
        addToolResult({
          tool: "editDiagram" as never,
          toolCallId: toolCall.toolCallId,
          output: { success: true, message: "Diagram edited" } as never,
        })
        return
      }

      if (toolCall.toolName === "getDiagramInfo") {
        const { infoType } = toolCall.input as { infoType: string }
        const info: Record<string, unknown> = {}

        try {
          if (typeof window !== "undefined" && window.crafterMermaid) {
            const result = window.crafterMermaid.parse(currentSource)
            if (result.ast) {
              const ast = result.ast as {
                type?: string
                nodes?: Map<string, unknown>
                edges?: unknown[]
                messages?: unknown[]
                participants?: unknown[]
                classes?: Map<string, unknown>
                relations?: unknown[]
                entities?: Map<string, unknown>
                slices?: unknown[]
              }

              if (infoType === "type" || infoType === "all") {
                info.type = ast.type || "unknown"
              }

              if (infoType === "nodes" || infoType === "all") {
                if (ast.type === "sequence") {
                  info.nodeCount = ast.participants?.length || 0
                } else if (ast.type === "class") {
                  info.nodeCount = ast.classes?.size || 0
                } else if (ast.type === "er") {
                  info.nodeCount = ast.entities?.size || 0
                } else {
                  info.nodeCount = ast.nodes?.size || 0
                }
              }

              if (infoType === "edges" || infoType === "all") {
                if (ast.type === "sequence") {
                  info.edgeCount = ast.messages?.length || 0
                } else if (ast.type === "class" || ast.type === "er") {
                  info.edgeCount = ast.relations?.length || 0
                } else {
                  info.edgeCount = ast.edges?.length || 0
                }
              }
            }
          }

          info.lineCount = currentSource.split("\n").length
        } catch {
          info.error = "Failed to parse diagram"
        }

        addToolResult({
          tool: "getDiagramInfo" as never,
          toolCallId: toolCall.toolCallId,
          output: info as never,
        })
        return
      }
    },
  })

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      const viewport = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]')
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight
      }
    }
  }, [messages])

  // Re-focus input when response completes
  useEffect(() => {
    if (status === "ready") {
      inputRef.current?.focus()
    }
  }, [status])

  const isLoading = status === "streaming" || status === "submitted"

  const handleSend = useCallback((text: string) => {
    if (text.trim()) {
      autoSendCountRef.current = 0
      sendMessage({ text })
      setInput("")
    }
  }, [sendMessage])

  const handleClearChat = () => {
    setMessages([])
  }

  return (
    <div className="flex flex-col h-full border-l border-[var(--border)] bg-[var(--bg-primary)]">
      {/* Header */}
      <div className="flex items-center justify-between px-3 h-9 border-b border-[var(--border)] bg-[var(--bg-secondary)]">
        <div className="relative">
          <select
            value={modelId}
            onChange={(e) => setModelId(e.target.value)}
            className="appearance-none text-[10px] font-mono text-[var(--text-muted)] bg-transparent pr-4 cursor-pointer focus:outline-none hover:text-[var(--text-primary)] transition-colors"
          >
            {AI_MODELS.map((m) => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
          <ChevronDownIcon className="absolute right-0 top-1/2 -translate-y-1/2 size-3 text-[var(--text-muted)] pointer-events-none" />
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              onClick={handleClearChat}
            >
              <Trash2Icon className="size-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Clear Chat</TooltipContent>
        </Tooltip>
      </div>

      {/* Messages */}
      <div className="flex-1 min-h-0">
        <ScrollArea className="h-full" ref={scrollRef}>
          <ChatMessages messages={messages} isLoading={isLoading} status={status} />
        </ScrollArea>
      </div>

      {/* Input */}
      <div className="border-t border-[var(--border)] bg-[var(--bg-secondary)] p-2">
        <div className="rounded-lg bg-[var(--bg-primary)] border border-[var(--border)]">
          <ChatInput
            ref={inputRef}
            onSend={handleSend}
            onStop={stop}
            disabled={isLoading}
            isLoading={isLoading}
            value={input}
            onChange={setInput}
          />
        </div>
      </div>
    </div>
  )
})
