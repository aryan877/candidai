import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { callId, callType } = await req.json();

    if (!callId) {
      return NextResponse.json(
        { error: "callId is required" },
        { status: 400 }
      );
    }

    const agentServerUrl =
      process.env.AGENT_SERVER_URL || "http://localhost:8765";

    const response = await fetch(`${agentServerUrl}/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        call_id: callId,
        call_type: callType || "default",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Agent server error:", errorText);
      return NextResponse.json(
        { error: "Agent server returned an error" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error connecting agent:", error);
    return NextResponse.json(
      { error: "Failed to connect to agent server. Is it running?" },
      { status: 502 }
    );
  }
}
