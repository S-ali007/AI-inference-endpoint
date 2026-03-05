"use client"

import { useState, useRef, useEffect } from "react"

type ChatMessage = {
  role: string
  content: string
}

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [isStreaming, setIsStreaming] = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  async function createConversation() {
    const res = await fetch("/api/conversation", {
      method: "POST",
    })

    const data = (await res.json()) as { id: string }
    setConversationId(data.id)
    return data.id
  }

  async function sendMessage() {
    if (!input.trim() || isStreaming) return

    let currentConversationId = conversationId

    if (!currentConversationId) {
      currentConversationId = await createConversation()
    }

    const userMessage: ChatMessage = {
      role: "user",
      content: input,
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsStreaming(true)

    const res = await fetch("/api/message", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content: userMessage.content,
        conversationId: currentConversationId,
      }),
    })

    if (!res.body) {
      setIsStreaming(false)
      return
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()

    let aiText = ""

    // Insert empty assistant message
    setMessages((prev) => [...prev, { role: "assistant", content: "" }])

    while (true) {
      const { done, value } = await reader.read()

      if (done) break

      const chunk = decoder.decode(value)
      aiText += chunk

      setMessages((prev) => {
        const updated = [...prev]

        const lastMessage = updated[updated.length - 1]

        updated[updated.length - 1] = {
          ...lastMessage,
          content: aiText,
        }

        return updated
      })
    }

    setIsStreaming(false)
  }

  return (
    <div style={{ padding: 20, maxWidth: 700, margin: "0 auto" }}>
      <h1>AI Chat</h1>

      <div
        style={{
          marginBottom: 20,
          minHeight: 300,
          border: "1px solid #ddd",
          padding: 10,
        }}
      >
        {messages.map((msg, index) => (
          <div key={index} style={{ marginBottom: 10 }}>
            <strong>{msg.role}:</strong> {msg.content}
          </div>
        ))}

        {isStreaming && <p>AI is typing...</p>}

        <div ref={bottomRef} />
      </div>

      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Type a message..."
        style={{ width: "70%", padding: 8 }}
        onKeyDown={(e) => {
          if (e.key === "Enter") sendMessage()
        }}
      />

      <button
        onClick={sendMessage}
        disabled={isStreaming}
        style={{ padding: 8, marginLeft: 10 }}
      >
        Send
      </button>
    </div>
  )
}