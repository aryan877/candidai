import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,

  users: defineTable({
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    image: v.optional(v.string()),
    isAnonymous: v.optional(v.boolean()),
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    role: v.union(v.literal("admin"), v.literal("candidate")),
    streamUserId: v.optional(v.string()),
    createdAt: v.number(),
    lastSeenAt: v.optional(v.number()),
  })
    .index("email", ["email"])
    .index("phone", ["phone"])
    .index("by_role", ["role"])
    .index("by_stream_id", ["streamUserId"]),

  interviews: defineTable({
    callId: v.string(),
    inviteToken: v.string(),
    createdBy: v.id("users"),
    candidateUserId: v.optional(v.id("users")),
    candidateEmail: v.optional(v.string()),
    type: v.union(
      v.literal("technical"),
      v.literal("behavioral"),
      v.literal("system-design"),
      v.literal("full")
    ),
    status: v.union(
      v.literal("waiting"),
      v.literal("active"),
      v.literal("completed"),
      v.literal("cancelled")
    ),
    phase: v.optional(v.string()),
    recordingUrl: v.optional(v.string()),
    createdAt: v.number(),
    startedAt: v.optional(v.number()),
    endedAt: v.optional(v.number()),
  })
    .index("by_call_id", ["callId"])
    .index("by_invite_token", ["inviteToken"])
    .index("by_creator", ["createdBy"])
    .index("by_candidate", ["candidateUserId"])
    .index("by_status", ["status"])
    .index("by_creator_status", ["createdBy", "status"]),

  reports: defineTable({
    interviewId: v.id("interviews"),
    overallScore: v.number(),
    recommendation: v.string(),
    summary: v.string(),
    strengths: v.array(v.string()),
    improvements: v.array(v.string()),
    createdAt: v.number(),
  }).index("by_interview", ["interviewId"]),

  scores: defineTable({
    interviewId: v.id("interviews"),
    dimension: v.string(),
    score: v.number(),
    feedback: v.string(),
    questionText: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_interview", ["interviewId"]),

  transcripts: defineTable({
    interviewId: v.id("interviews"),
    speaker: v.string(),
    content: v.string(),
    phase: v.optional(v.string()),
    timestamp: v.number(),
  }).index("by_interview", ["interviewId"]),

  codeSubmissions: defineTable({
    interviewId: v.id("interviews"),
    challengeTitle: v.string(),
    language: v.string(),
    code: v.string(),
    output: v.optional(v.string()),
    passed: v.optional(v.boolean()),
    feedback: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_interview", ["interviewId"]),

  bodyLanguageSnapshots: defineTable({
    interviewId: v.id("interviews"),
    postureScore: v.number(),
    fidgetingLevel: v.number(),
    eyeContactScore: v.number(),
    isSuspicious: v.boolean(),
    notes: v.optional(v.string()),
    timestamp: v.number(),
  })
    .index("by_interview", ["interviewId"])
    .index("by_interview_timestamp", ["interviewId", "timestamp"])
    .index("by_interview_suspicious", ["interviewId", "isSuspicious"]),

  cheatingIncidents: defineTable({
    interviewId: v.id("interviews"),
    category: v.string(),
    severity: v.number(),
    description: v.string(),
    transcriptSnippet: v.optional(v.string()),
    postureScore: v.optional(v.number()),
    fidgetingLevel: v.optional(v.number()),
    eyeContactScore: v.optional(v.number()),
    evidenceStorageId: v.optional(v.id("_storage")),
    phase: v.optional(v.string()),
    reviewed: v.boolean(),
    reviewedBy: v.optional(v.id("users")),
    timestamp: v.number(),
  })
    .index("by_interview", ["interviewId"])
    .index("by_interview_timestamp", ["interviewId", "timestamp"])
    .index("by_interview_reviewed", ["interviewId", "reviewed"]),
});
