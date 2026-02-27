import { StreamClient } from "@stream-io/node-sdk";
import { NextResponse } from "next/server";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { fetchMutation } from "convex/nextjs";
import { api } from "../../../../convex/_generated/api";

const apiKey = process.env.NEXT_PUBLIC_STREAM_API_KEY;
const secret = process.env.STREAM_API_SECRET;

export async function POST() {
  if (!apiKey || !secret) {
    return NextResponse.json(
      { error: "Stream API key or secret not configured" },
      { status: 500 }
    );
  }

  try {
    const authToken = await convexAuthNextjsToken();
    if (!authToken) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const user = await fetchMutation(
      api.users.ensureStreamIdentity,
      {},
      { token: authToken }
    );

    const client = new StreamClient(apiKey, secret);

    await client.upsertUsers([
      { id: user.streamUserId, name: user.name || user.streamUserId },
    ]);

    const validity = 24 * 60 * 60; // 24 hours
    const token = client.generateUserToken({
      user_id: user.streamUserId,
      validity_in_seconds: validity,
    });

    return NextResponse.json({
      token,
      apiKey,
      userId: user.streamUserId,
      userName: user.name,
      role: user.role,
    });
  } catch (error) {
    console.error("Error generating Stream token:", error);
    return NextResponse.json(
      { error: "Failed to generate token" },
      { status: 500 }
    );
  }
}
