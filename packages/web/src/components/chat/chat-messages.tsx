"use client"

import type { UIMessage } from "ai"
import { SparklesIcon } from "lucide-react"
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message"
import {
  Tool,
  ToolHeader,
  ToolContent,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool"
import { ConversationEmptyState } from "@/components/ai-elements/conversation"
import { Loader } from "@/components/ai-elements/loader"
import {
  Reasoning,
  ReasoningTrigger,
  ReasoningContent,
} from "@/components/ai-elements/reasoning"

interface ChatMessagesProps {
  messages: UIMessage[]
  isLoading: boolean
  status?: string
}

export function ChatMessages({ messages, isLoading }: ChatMessagesProps) {
  if (messages.length === 0) {
    return (
      <ConversationEmptyState
        icon={<SparklesIcon className="size-8 text-[var(--text-muted)]" />}
        title="Mermaid AI"
        description="Describe a diagram and I'll create it for you."
        className="py-4 text-xs"
      />
    )
  }

  return (
    <div className="flex flex-col gap-2 px-3 py-2">
      {messages.map((message, index) => (
        <Message key={`${message.id}-${index}`} from={message.role} className="max-w-full">
          <MessageContent className="text-xs">
            {message.parts.map((part, partIndex) => {
              if (part.type === "text") {
                return message.role === "assistant" ? (
                  <MessageResponse key={partIndex} className="text-xs [&_*]:text-xs [&_pre]:text-[10px] [&_code]:text-[10px]">
                    {part.text}
                  </MessageResponse>
                ) : (
                  <span key={partIndex} className="whitespace-pre-wrap text-xs">
                    {part.text}
                  </span>
                )
              }

              if (part.type === "reasoning") {
                const reasoningPart = part as {
                  type: "reasoning"
                  text: string
                  state?: "streaming" | "done"
                }

                return (
                  <Reasoning
                    key={partIndex}
                    isStreaming={reasoningPart.state === "streaming"}
                    defaultOpen={false}
                    className="mb-1 [&_*]:text-xs"
                  >
                    <ReasoningTrigger className="text-xs" />
                    <ReasoningContent className="text-xs">
                      {reasoningPart.text}
                    </ReasoningContent>
                  </Reasoning>
                )
              }

              if (part.type.startsWith("tool-") || part.type === "dynamic-tool") {
                const toolPart = part as {
                  type: string
                  toolCallId: string
                  toolName?: string
                  input?: unknown
                  output?: unknown
                  errorText?: string
                  state?: string
                }
                const toolName = part.type === "dynamic-tool"
                  ? toolPart.toolName ?? "Tool"
                  : part.type.replace("tool-", "")

                return (
                  <Tool key={toolPart.toolCallId || partIndex} defaultOpen={false} className="mb-1">
                    <ToolHeader
                      type={part.type as "dynamic-tool"}
                      state={(toolPart.state || "input-available") as "input-available"}
                      toolName={toolName}
                      title={getToolTitle(toolName)}
                      small
                    />
                    <ToolContent>
                      {toolPart.input !== undefined && toolPart.input !== null ? (
                        <ToolInput input={toolPart.input} className="p-2 [&_pre]:text-[10px] [&_code]:text-[10px]" />
                      ) : null}
                      {toolPart.output !== undefined || toolPart.errorText !== undefined ? (
                        <ToolOutput
                          output={toolPart.output}
                          errorText={toolPart.errorText}
                          className="p-2 [&_pre]:text-[10px] [&_code]:text-[10px]"
                        />
                      ) : null}
                    </ToolContent>
                  </Tool>
                )
              }

              return null
            })}
          </MessageContent>
        </Message>
      ))}

      {isLoading && (
        <Message from="assistant">
          <MessageContent className="text-xs">
            <Loader size={12} />
          </MessageContent>
        </Message>
      )}
    </div>
  )
}

function getToolTitle(toolName: string): string {
  const titles: Record<string, string> = {
    setDiagram: "Set Diagram",
    editDiagram: "Edit Diagram",
    getDiagramInfo: "Get Diagram Info",
  }
  return titles[toolName] || toolName
}
