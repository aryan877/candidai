import { action, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import OpenAI from "openai";
import {
  findInterviewByCallId,
  requireInterviewAccess,
} from "./lib/authz";

/** Shape returned by _getInterviewData (breaks circular type inference). */
interface InterviewData {
  interview: Doc<"interviews">;
  existingReport: Id<"reports"> | null;
  transcripts: Doc<"transcripts">[];
  codeSubmissions: Doc<"codeSubmissions">[];
}

interface AIReport {
  overallScore: number;
  recommendation: string;
  summary: string;
  strengths: string[];
  improvements: string[];
}

export const create = mutation({
  args: {
    interviewId: v.id("interviews"),
    overallScore: v.number(),
    recommendation: v.string(),
    summary: v.string(),
    strengths: v.array(v.string()),
    improvements: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const interview = await ctx.db.get(args.interviewId);
    if (!interview) {
      throw new Error("Interview not found");
    }
    await requireInterviewAccess(ctx, interview);

    const existing = await ctx.db
      .query("reports")
      .withIndex("by_interview", (q) => q.eq("interviewId", args.interviewId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        overallScore: args.overallScore,
        recommendation: args.recommendation,
        summary: args.summary,
        strengths: args.strengths,
        improvements: args.improvements,
        createdAt: Date.now(),
      });
      return existing._id;
    }

    return await ctx.db.insert("reports", {
      interviewId: args.interviewId,
      overallScore: args.overallScore,
      recommendation: args.recommendation,
      summary: args.summary,
      strengths: args.strengths,
      improvements: args.improvements,
      createdAt: Date.now(),
    });
  },
});

export const getByInterview = query({
  args: {
    interviewId: v.id("interviews"),
  },
  handler: async (ctx, args) => {
    const interview = await ctx.db.get(args.interviewId);
    if (!interview) return null;
    await requireInterviewAccess(ctx, interview);

    return await ctx.db
      .query("reports")
      .withIndex("by_interview", (q) => q.eq("interviewId", args.interviewId))
      .first();
  },
});

/** Internal mutation used by the action to persist the AI-generated report. */
export const _saveReport = internalMutation({
  args: {
    interviewId: v.id("interviews"),
    overallScore: v.number(),
    recommendation: v.string(),
    summary: v.string(),
    strengths: v.array(v.string()),
    improvements: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("reports")
      .withIndex("by_interview", (q) => q.eq("interviewId", args.interviewId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        overallScore: args.overallScore,
        recommendation: args.recommendation,
        summary: args.summary,
        strengths: args.strengths,
        improvements: args.improvements,
        createdAt: Date.now(),
      });
      return existing._id;
    }

    return await ctx.db.insert("reports", {
      interviewId: args.interviewId,
      overallScore: args.overallScore,
      recommendation: args.recommendation,
      summary: args.summary,
      strengths: args.strengths,
      improvements: args.improvements,
      createdAt: Date.now(),
    });
  },
});

/**
 * AI-powered report generation. Reads the full transcript + code submissions,
 * sends to GPT-4o-mini, and persists a fully graded report.
 */
export const generateReport = action({
  args: {
    interviewId: v.id("interviews"),
  },
  handler: async (ctx, args): Promise<Id<"reports"> | null> => {
    // 1. Gather all interview data
    const data = await ctx.runQuery(
      internal.reports._getInterviewData,
      { interviewId: args.interviewId },
    ) as InterviewData | null;

    if (!data) throw new Error("Interview not found");

    // If report already exists, skip
    if (data.existingReport) return data.existingReport;

    // 2. Build the transcript text
    const transcriptText = data.transcripts.length > 0
      ? data.transcripts
          .map((t) => `[${t.speaker}]: ${t.content}`)
          .join("\n")
      : "(No transcript recorded)";

    const codeText = data.codeSubmissions.length > 0
      ? data.codeSubmissions
          .map((c) =>
            `### ${c.challengeTitle} (${c.language})\n\`\`\`${c.language}\n${c.code}\n\`\`\``
          )
          .join("\n\n")
      : "";

    // 3. Call GPT-4o-mini to grade
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const systemPrompt = `You are an expert technical interview evaluator. Given a full interview transcript (and optionally code submissions), produce a structured JSON evaluation.

Score dimensions (0-10 scale): communication, problem-solving, technical-knowledge, code-quality, behavioral.
- 9-10: Exceptional. 7-8: Strong. 5-6: Adequate. 3-4: Below expectations. 1-2: Not ready.

Recommendation: "strong_yes", "yes", "maybe", "no", or "strong_no" based on overall performance.

Respond ONLY with valid JSON in this exact format:
{
  "overallScore": <number 0-10>,
  "recommendation": "<string>",
  "summary": "<2-3 sentence overall assessment>",
  "strengths": ["<strength 1>", "<strength 2>", ...],
  "improvements": ["<area 1>", "<area 2>", ...]
}`;

    const userPrompt = `## Interview Transcript
${transcriptText}
${codeText ? `\n## Code Submissions\n${codeText}` : ""}

Evaluate this candidate's performance across all dimensions and produce the JSON report.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-5.2",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    let report: AIReport;

    try {
      report = JSON.parse(raw) as AIReport;
    } catch {
      report = {
        overallScore: 5.0,
        recommendation: "maybe",
        summary: "Interview completed. Unable to generate detailed analysis.",
        strengths: [],
        improvements: [],
      };
    }

    // Clamp and validate
    report.overallScore = Math.max(0, Math.min(10, report.overallScore ?? 5));
    report.recommendation = ["strong_yes", "yes", "maybe", "no", "strong_no"].includes(
      report.recommendation
    )
      ? report.recommendation
      : "maybe";
    report.strengths = Array.isArray(report.strengths) ? report.strengths : [];
    report.improvements = Array.isArray(report.improvements) ? report.improvements : [];

    // 4. Persist
    const reportId = await ctx.runMutation(
      internal.reports._saveReport,
      {
        interviewId: args.interviewId,
        overallScore: report.overallScore,
        recommendation: report.recommendation,
        summary: report.summary || "Interview completed.",
        strengths: report.strengths,
        improvements: report.improvements,
      },
    ) as Id<"reports">;

    return reportId;
  },
});

/** Internal query to gather all interview data for the AI grader. */
export const _getInterviewData = internalQuery({
  args: { interviewId: v.id("interviews") },
  handler: async (ctx, args) => {
    const interview = await ctx.db.get(args.interviewId);
    if (!interview) return null;

    const existingReport = await ctx.db
      .query("reports")
      .withIndex("by_interview", (q) => q.eq("interviewId", args.interviewId))
      .first();

    const transcripts = await ctx.db
      .query("transcripts")
      .withIndex("by_interview", (q) => q.eq("interviewId", args.interviewId))
      .order("asc")
      .collect();

    const codeSubmissions = await ctx.db
      .query("codeSubmissions")
      .withIndex("by_interview", (q) => q.eq("interviewId", args.interviewId))
      .collect();

    return {
      interview,
      existingReport: existingReport?._id ?? null,
      transcripts,
      codeSubmissions,
    };
  },
});

export const getByCallId = query({
  args: {
    callId: v.string(),
  },
  handler: async (ctx, args) => {
    const interview = await findInterviewByCallId(ctx, args.callId);
    if (!interview) return null;
    await requireInterviewAccess(ctx, interview);

    return await ctx.db
      .query("reports")
      .withIndex("by_interview", (q) => q.eq("interviewId", interview._id))
      .first();
  },
});
