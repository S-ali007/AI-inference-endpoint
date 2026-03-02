import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"

export async function POST() {
  try {
    const user = await prisma.user.upsert({
      where: { email: "demo-user@example.com" },
      update: {},
      create: { email: "demo-user@example.com" },
    })

    const conversation = await prisma.conversation.create({
      data: {
        userId: user.id,
      },
    })

    return NextResponse.json(conversation)
  } catch (error) {
    console.error("Failed to create conversation", error)
    return NextResponse.json(
      { error: "Failed to create conversation" },
      { status: 500 }
    )
  }
}
