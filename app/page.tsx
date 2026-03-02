"use client"

import { useState } from "react"

type ChatMessage = {
  role: string
  content: string
}

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [conversationId, setConversationId] = useState<string | null>(null)

  async function createConversation() {
    const res = await fetch("/api/conversation", {
      method: "POST",
    })

    const data = (await res.json()) as { id: string }
    setConversationId(data.id)
    return data.id
  }

 async function sendMessage() {
  if (!input.trim()) return

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

  if (!res.body) return

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let aiText = ""

  // Add empty AI message first
  setMessages((prev) => [...prev, { role: "assistant", content: "" }])

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const chunk = decoder.decode(value)
    aiText += chunk

    // Update last AI message progressively
    setMessages((prev) => {
      const updated = [...prev]
      updated[updated.length - 1].content = aiText
      return updated
    })
  }
}
  return (
    <div style={{ padding: 20 }}>
      <h1>AI Chat</h1>

      <div style={{ marginBottom: 20 }}>
        {messages.map((msg, index) => (
          <div key={index}>
            <strong>{msg.role}:</strong> {msg.content}
          </div>
        ))}
      </div>

      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Type a message..."
        style={{ width: "70%", padding: 8 }}
      />

      <button onClick={sendMessage} style={{ padding: 8, marginLeft: 10 }}>
        Send
      </button>
    </div>
  )
}
