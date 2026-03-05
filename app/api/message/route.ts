import { z } from "zod"

import { GoogleGenAI } from "@google/genai";
import { prisma } from "@/lib/prisma"
const ai = new GoogleGenAI({});

const messageBodySchema = z.object({
  content: z.string().trim().min(1),
  conversationId: z.string().trim().min(1),
})

export async function POST(req: Request) {
  try {
    const parsed = messageBodySchema.safeParse(await req.json())

    if (!parsed.success) {
      return new Response("Invalid body", { status: 400 })
    }

    const { content, conversationId } = parsed.data

    // Save user message first
    await prisma.message.create({
      data: {
        content,
        role: "user",
        conversationId,
      },
    })
const previousMessages = await prisma.message.findMany({
  where: {
    conversationId,
  },
  orderBy: {
    createdAt: "desc",
  },
  take: 12
  
})

const formattedHistory = previousMessages
  .reverse()
  .map((msg) => ({
    role: msg.role === "assistant" ? "model" : "user",
    parts: [{ text: msg.content }],
  }))
const systemPrompt = {
  role: "user",
  parts: [
    {
      text: `
You are a helpful AI assistant for developers.

Guidelines:
- Answer the user's question directly.
- Use clear explanations.
- Be concise unless the user asks for details.
- Maintain conversation context.
- Do not assume questions beyond what the user asks.
`,
    },
  ],
}
 const stream = await ai.models.generateContentStream({
  model: "gemini-2.5-flash",
  contents: [
    systemPrompt,
    ...formattedHistory,
    { 
      role: "user",
      parts: [{ text: content }],
    },
  ],
  config: {
    temperature: 0.7,
    maxOutputTokens: 1024,
  },
})

    const encoder = new TextEncoder()

    const readableStream = new ReadableStream({
      async start(controller) {
        let fullText = ""
        let usage: Record<string, number | undefined> | undefined

        for await (const chunk of stream) {
          const text = chunk.text
          const chunkUsage = (
            chunk as unknown as { usageMetadata?: Record<string, number> }
          ).usageMetadata

          if (chunkUsage) {
            usage = chunkUsage
          }

          if (text) {
            fullText += text
            controller.enqueue(encoder.encode(text))
          }
        }

        const promptTokens = usage?.promptTokenCount ?? usage?.inputTokenCount
        const completionTokens =
          usage?.candidatesTokenCount ?? usage?.outputTokenCount
        const totalTokens = usage?.totalTokenCount

        // Save full AI response after stream finishes
        await prisma.message.create({
          data: {
            content: fullText,
            role: "assistant",
            conversationId,
            promptTokens,
            completionTokens,
            totalTokens,
          },
        })

        controller.close()
      },
    })

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/plain",
      },
    })
  } catch (error) {
    console.error(error)
    return new Response("Error", { status: 500 })
  }
}
