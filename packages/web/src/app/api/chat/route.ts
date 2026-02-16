import { createGateway } from "ai"
import { streamText, tool, zodSchema, convertToModelMessages, type UIMessage, stepCountIs } from "ai"
import { z } from "zod"

export const maxDuration = 60

export async function POST(req: Request) {
  const gateway = createGateway({
    apiKey: process.env.AI_GATEWAY_API_KEY,
  })

  const { messages, diagramSource, model: requestModel }: { messages: UIMessage[]; diagramSource?: string; model?: string } = await req.json()
  const modelMessages = await convertToModelMessages(messages)

  const allowedModels = ["openai/gpt-5-mini", "openai/gpt-oss-120b", "alibaba/qwen-3-32b"]
  const selectedModel = requestModel && allowedModels.includes(requestModel) ? requestModel : "openai/gpt-5-mini"

  const systemPrompt = `You are Mermaid AI, a diagram generator. Your primary job is to ALWAYS produce a diagram using your tools.

Current diagram:
${diagramSource?.trim() ? diagramSource : "(empty)"}

CORE BEHAVIOR:
- Every user message should result in a diagram. No exceptions.
- If the user describes something, create a diagram for it immediately using setDiagram.
- If there's already a diagram and the user wants changes, use editDiagram for small tweaks or setDiagram for big changes.
- Never just explain how to make a diagram — make it.
- Keep text responses very short (1-2 sentences max). The diagram is the answer.

DIAGRAM TYPES:
flowchart (graph LR/TB/TD/RL/BT), sequenceDiagram, classDiagram, stateDiagram-v2, erDiagram, pie, gantt, mindmap, timeline, gitGraph, sankey-beta, xychart-beta

SYNTAX RULES:
- CRITICAL: Only raw mermaid syntax. NEVER include \`\`\`mermaid or \`\`\` fences in tool content.
- Use valid mermaid syntax. If a parse error is returned, fix the syntax and retry.
- Use clear, readable labels. Prefer descriptive node names over single letters when appropriate.

TOOL SELECTION:
- setDiagram: New diagram or major rewrite. Always prefer this when there's no diagram yet.
- editDiagram: Small targeted change to existing diagram (find and replace exact text).
- getDiagramInfo: Only when you need to inspect the current diagram structure.`

  const result = streamText({
    model: gateway(selectedModel),
    system: systemPrompt,
    messages: modelMessages,
    ...(selectedModel.startsWith("openai/") && {
      providerOptions: {
        openai: {
          reasoningSummary: "auto",
        },
      },
    }),
    stopWhen: stepCountIs(3),
    tools: {
      setDiagram: tool({
        description: "Replace the entire diagram with new content. Use this when creating a new diagram from scratch or making major changes.",
        inputSchema: zodSchema(z.object({
          content: z.string().describe("Raw mermaid diagram syntax only. NEVER include ```mermaid or ``` fences."),
        })),
      }),
      editDiagram: tool({
        description: "Find and replace text in the current diagram. Use this for targeted modifications to existing diagrams.",
        inputSchema: zodSchema(z.object({
          oldText: z.string().describe("The exact text to find in the current diagram"),
          newText: z.string().describe("The replacement text"),
        })),
      }),
      getDiagramInfo: tool({
        description: "Get information about the current diagram structure (type, node count, edge count, line count)",
        inputSchema: zodSchema(z.object({
          infoType: z.enum(["type", "nodes", "edges", "all"]).describe("What information to retrieve"),
        })),
      }),
    },
  })

  return result.toUIMessageStreamResponse()
}
