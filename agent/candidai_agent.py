"""
CandidAI Agent -- AI-powered technical interviewer

Main entry point for the CandidAI vision agent. Uses the Vision Agents SDK
to create a pipeline that:
  1. YOLO Pose Processor      -- detects body keypoints for body language analysis
  2. OpenRouter LLM            -- conducts the interview conversation
  3. Edge TTS (free)          -- speaks the interviewer's responses
  4. Deepgram STT             -- transcribes the candidate's speech
  5. Smart Turn Detection     -- manages natural conversation flow
  6. PostgreSQL pgvector RAG  -- semantic search over interview questions

Usage:
    python main.py run          # interactive console mode
    python main.py serve        # HTTP server mode (production)
"""

import asyncio
import logging
import os
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv

# Log OpenRouter + agent at INFO, enable RTC track debugging
logging.basicConfig(level=logging.INFO)
logging.getLogger("aiortc").setLevel(logging.WARNING)
logging.getLogger("websockets").setLevel(logging.WARNING)
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("getstream.video.rtc").setLevel(logging.INFO)
logging.getLogger("getstream.video.rtc.signaling").setLevel(logging.INFO)
logging.getLogger("getstream.video.rtc.pc").setLevel(logging.DEBUG)
logging.getLogger("getstream.video.rtc.peer_connection").setLevel(logging.DEBUG)

from getstream.video.rtc.pb.stream.video.sfu.models.models_pb2 import (
    TrackType as StreamTrackType,
)
from getstream.video.rtc.tracks import TrackSubscriptionConfig

from vision_agents.core import Agent, AgentLauncher, Runner, User
from vision_agents.core.stt.events import STTTranscriptEvent
from vision_agents.core.llm.events import LLMResponseCompletedEvent
from vision_agents.core.llm.events import ToolStartEvent, ToolEndEvent
from vision_agents.core.turn_detection import TurnStartedEvent, TurnEndedEvent
from vision_agents.core.tts.events import (
    TTSErrorEvent,
    TTSSynthesisCompleteEvent,
    TTSSynthesisStartEvent,
)
from vision_agents.plugins import deepgram, smart_turn
from vision_agents.plugins.getstream.stream_edge_transport import StreamEdge
from vision_agents.plugins.getstream.sfu_events import TrackPublishedEvent

from pg_rag import PgRag
from pose_processor import PoseProcessor
from openrouter_vlm import OpenRouterVLM
from edge_tts_plugin import TTS as EdgeTTS
from events import BodyLanguageEvent

load_dotenv()

logger = logging.getLogger(__name__)

EDGE_TTS_VOICE = os.getenv("EDGE_TTS_VOICE", "en-US-AriaNeural")
KNOWLEDGE_DIR = Path(__file__).parent / "interview_questions"


def _env_bool(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


class StableStreamEdge(StreamEdge):
    """GetStream edge configured for stable default audio-only subscriptions."""

    def __init__(self, subscribe_video: bool):
        super().__init__()
        self._subscribe_video = subscribe_video

    def _get_subscription_config(self):
        track_types = [StreamTrackType.TRACK_TYPE_AUDIO]

        if self._subscribe_video:
            # Subscribe to webcam + screen share tracks
            # Screen share auto-prioritizes when available (priority=1)
            # Falls back to webcam when screen share not active (priority=0)
            track_types.append(StreamTrackType.TRACK_TYPE_VIDEO)
            track_types.append(StreamTrackType.TRACK_TYPE_SCREEN_SHARE)

        return TrackSubscriptionConfig(track_types=track_types)

    async def _on_track_published(self, event: TrackPublishedEvent):
        """Ignore non-audio remote tracks in stable audio-only mode."""
        if not self._subscribe_video:
            track_type = getattr(getattr(event, "payload", None), "type", None)
            if track_type != StreamTrackType.TRACK_TYPE_AUDIO:
                logger.debug("Skipping non-audio track (video disabled): type=%s", track_type)
                return

        logger.info("Processing track published event: type=%s", getattr(getattr(event, "payload", None), "type", None))
        await super()._on_track_published(event)


class CandidAIAgent(Agent):
    """Agent with barge-in disabled and event-driven greeting guard.

    Greeting guard uses asyncio.Event (not timers) — responses from user
    turns are suppressed until the greeting TTS actually finishes playing.
    Override point: simple_response() (SDK-documented extension).
    """

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Gate starts OPEN (set) — no suppression until begin_greeting()
        self._greeting_gate = asyncio.Event()
        self._greeting_gate.set()

    def begin_greeting(self) -> None:
        """Lock the response gate — user turns suppressed until TTS done."""
        self._greeting_gate.clear()
        logger.info("Greeting gate LOCKED — user turns suppressed until TTS completes")

    def end_greeting(self) -> None:
        """Unlock the response gate — greeting TTS has finished."""
        if not self._greeting_gate.is_set():
            self._greeting_gate.set()
            logger.info("Greeting gate UNLOCKED — user turns now processed")

    async def simple_response(self, text: str = "", participant=None) -> None:
        """Gate user-triggered responses until greeting TTS completes.

        SDK docs (agents.py:577): "Overwrite simple_response if you want to
        change how the Agent class calls the LLM."

        - participant=None → agent-initiated (greeting, tool follow-ups) → always allowed
        - participant!=None → user turn triggered → gated by _greeting_gate
        """
        if participant is not None and not self._greeting_gate.is_set():
            logger.info(
                "Suppressing user-turn response (greeting TTS still playing): %r",
                text[:80],
            )
            return
        await super().simple_response(text, participant)

    async def _on_turn_event(self, event: TurnStartedEvent | TurnEndedEvent) -> None:
        """Disable barge-in: ignore TurnStartedEvent from user (no interrupts)."""
        participant = getattr(event, "participant", None)
        is_user = participant and participant.user_id != self.agent_user.id

        if isinstance(event, TurnStartedEvent) and is_user:
            return  # barge-in disabled

        await super()._on_turn_event(event)


async def create_agent(**kwargs) -> Agent:
    """Create and configure the CandidAI interviewer agent."""
    subscribe_video = _env_bool("CANDIDAI_SUBSCRIBE_VIDEO", default=False)
    enable_pose = _env_bool("CANDIDAI_ENABLE_POSE", default=subscribe_video)
    logger.info(
        "Agent media mode: subscribe_video=%s, pose_processing=%s",
        subscribe_video,
        enable_pose,
    )

    # ── PostgreSQL + pgvector RAG ──
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise ValueError("DATABASE_URL environment variable not set")

    pg_rag = PgRag(
        database_url=database_url,
        questions_dir=KNOWLEDGE_DIR,
    )
    await pg_rag.start()

    # ── OpenAI GPT-5.2 VLM (vision + function calling) ──
    # Uses ChatCompletionsVLM for video frame buffering + tool calling
    # so the model can SEE the candidate's screen/webcam while interviewing
    # GPT-5.2 analyzes frames in real-time to critique code as user types
    llm = OpenRouterVLM(
        fps=1,                    # 1 frame/sec to keep costs down
        frame_buffer_seconds=5,   # send last 5 frames with each request
        frame_width=1280,         # high res so model can read code on screen
        frame_height=720,
    )

    pose_proc: Optional[PoseProcessor] = None
    processors = []
    if enable_pose:
        # Single processor: skeleton overlay (15fps) + body language metrics (2fps)
        pose_proc = PoseProcessor(fps=15, metrics_fps=2)
        processors.append(pose_proc)

    use_smart_turn = _env_bool("CANDIDAI_USE_SMART_TURN", default=False)
    turn_det = smart_turn.TurnDetection() if use_smart_turn else None
    logger.info("Turn detection: %s", "SmartTurn" if use_smart_turn else "STT-final (Deepgram endpointing)")

    agent = CandidAIAgent(
        edge=StableStreamEdge(subscribe_video=subscribe_video),
        agent_user=User(name="CandidAI", id="candidai-agent"),
        instructions="Read @instructions.md",
        processors=processors,
        llm=llm,
        tts=EdgeTTS(voice=EDGE_TTS_VOICE),
        stt=deepgram.STT(model="flux-general-en", eager_turn_detection=True),
        turn_detection=turn_det,
    )

    # Wire event system: pose processor -> agent
    if pose_proc is not None:
        agent.events.merge(pose_proc.events)

    # Store pg_rag on agent for cleanup
    agent._pg_rag = pg_rag

    # ------------------------------------------------------------------
    # Function tools
    # ------------------------------------------------------------------

    @llm.register_function(
        description="Search the interview knowledge base for relevant questions, evaluation criteria, and coding challenges. Call this when transitioning to a new phase or when you need specific questions for a topic the candidate mentioned."
    )
    async def search_knowledge_base(query: str) -> dict:
        """query: topic to search for, e.g. 'behavioral teamwork questions' or 'python coding challenge medium difficulty' or 'react hooks technical questions'"""
        result = await pg_rag.search(query)
        return {"results": result[:4000]} if result else {"results": "No results found."}

    @llm.register_function(
        description="Set the avatar's facial expression. Use this to show reactions during the interview - smile when candidate gives good answer, look thoughtful when considering their response, etc."
    )
    async def set_expression(expression: str, intensity: float = 0.8) -> dict:
        """expression: one of neutral, smile, thinking, surprised, nodding, concerned, encouraging, listening, impressed, questioning"""
        if intensity is None:
            intensity = 0.8
        await agent.send_custom_event({
            "type": "avatar_expression",
            "expression": expression,
            "intensity": intensity,
        })
        return {"applied": True, "expression": expression}

    @llm.register_function(
        description="Nod your head to show understanding or agreement. Use during candidate responses to show active listening."
    )
    async def nod_head(speed: str = "normal") -> dict:
        """speed: slow, normal, or fast"""
        if speed is None:
            speed = "normal"
        await agent.send_custom_event({
            "type": "avatar_action",
            "action": "nod",
            "speed": speed,
        })
        return {"applied": True}

    @llm.register_function(
        description="Raise eyebrows to show interest or surprise at something the candidate said."
    )
    async def raise_eyebrows(intensity: float = 0.7) -> dict:
        if intensity is None:
            intensity = 0.7
        await agent.send_custom_event({
            "type": "avatar_action",
            "action": "raise_eyebrows",
            "intensity": intensity,
        })
        return {"applied": True}

    @llm.register_function(
        description="Score the candidate's response on a specific dimension. Call this after evaluating each answer."
    )
    async def score_response(dimension: str, score: float, feedback: str) -> dict:
        """dimension: communication, problem-solving, technical-knowledge, code-quality, behavioral. score: 0-10"""
        await agent.send_custom_event({
            "type": "score_update",
            "dimension": dimension,
            "score": score,
            "feedback": feedback,
        })
        return {"recorded": True, "dimension": dimension, "score": score}

    @llm.register_function(
        description="Present a multiple-choice question to the candidate. Shows clickable options on their screen. Use during technical or behavioral phases to test knowledge quickly."
    )
    async def present_mcq(
        question: str, option_a: str, option_b: str, option_c: str, option_d: str, correct_option: str
    ) -> dict:
        """question: the MCQ question text. option_a/b/c/d: the four answer choices. correct_option: which is correct — 'A', 'B', 'C', or 'D'."""
        import uuid
        options = [option_a, option_b, option_c, option_d]
        correct_index = {"A": 0, "B": 1, "C": 2, "D": 3}.get(correct_option.upper(), 0)
        qid = str(uuid.uuid4())[:8]
        await agent.send_custom_event({
            "type": "mcq_question",
            "id": qid,
            "question": question,
            "options": options,
            "correct_index": correct_index,
        })
        return {"presented": True, "question_id": qid}

    @llm.register_function(
        description="Present a coding challenge to the candidate. This will load the code editor on their screen."
    )
    async def present_coding_challenge(
        title: str, description: str, language: str, starter_code: str
    ) -> dict:
        await agent.send_custom_event({
            "type": "coding_challenge",
            "title": title,
            "description": description,
            "language": language,
            "starter_code": starter_code,
        })
        return {"presented": True, "title": title}

    @llm.register_function(
        description="Evaluate code submitted by the candidate. Analyze correctness, efficiency, and style."
    )
    async def evaluate_code(code: str, language: str, challenge: str) -> dict:
        evaluation = {
            "challenge": challenge,
            "language": language,
            "code_length": len(code),
            "feedback": f"Code received for '{challenge}'. Review the {language} implementation for correctness, efficiency, and style.",
            "score": 7,
        }
        await agent.send_custom_event({
            "type": "code_evaluation",
            **evaluation,
        })
        return evaluation

    @llm.register_function(
        description="Transition to the next interview phase. Phases: intro, behavioral, technical, coding, wrapup"
    )
    async def transition_phase(phase: str) -> dict:
        await agent.send_custom_event({
            "type": "interview_phase",
            "phase": phase,
        })
        return {"transitioned": True, "phase": phase}

    @llm.register_function(
        description="Generate the final interview report. Call this at the end of the interview."
    )
    async def generate_report(
        overall_score: float,
        recommendation: str,
        strengths: list[str],
        improvements: list[str],
    ) -> dict:
        """recommendation: strong_yes, yes, maybe, no, strong_no"""
        await agent.send_custom_event({
            "type": "final_report",
            "overall_score": overall_score,
            "recommendation": recommendation,
            "strengths": strengths,
            "improvements": improvements,
        })
        return {"generated": True}

    # ------------------------------------------------------------------
    # Event subscriptions
    # ------------------------------------------------------------------

    @agent.events.subscribe
    async def on_body_language(event: BodyLanguageEvent):
        """Forward body language metrics to the frontend."""
        await agent.send_custom_event({
            "type": "body_language",
            "posture": event.posture_score,
            "fidgeting": event.fidgeting_level,
            "eye_contact": event.eye_contact_score,
        })

    @agent.events.subscribe
    async def on_user_transcript(event: STTTranscriptEvent):
        """Forward candidate speech transcription to the frontend."""
        if event.text and event.text.strip():
            text = event.text.strip()
            logger.info("STT transcript: %r", text[:120])
            await agent.send_custom_event({
                "type": "speech_transcription",
                "speaker": "candidate",
                "text": text,
            })

    @llm.events.subscribe
    async def on_agent_response(event: LLMResponseCompletedEvent):
        """Forward agent speech to the frontend transcript."""
        logger.info("LLM RESPONSE COMPLETED: text=%r, latency=%s ms",
                     event.text[:100] if event.text else None,
                     getattr(event, 'latency_ms', '?'))
        if event.text and event.text.strip():
            await agent.send_custom_event({
                "type": "speech_transcription",
                "speaker": "agent",
                "text": event.text.strip(),
            })

    @llm.events.subscribe
    async def on_tool_start(event: ToolStartEvent):
        logger.info("TOOL CALL: %s(%s)", event.tool_name, event.arguments)

    @llm.events.subscribe
    async def on_tool_end(event: ToolEndEvent):
        logger.info("TOOL DONE: %s success=%s", event.tool_name, event.success)

    if agent.tts is not None:
        @agent.tts.events.subscribe
        async def on_tts_start(event: TTSSynthesisStartEvent):
            logger.info("TTS START: %r", (event.text or "")[:120])

        @agent.tts.events.subscribe
        async def on_tts_complete(event: TTSSynthesisCompleteEvent):
            logger.info(
                "TTS COMPLETE: bytes=%s duration_ms=%s",
                event.total_audio_bytes,
                event.audio_duration_ms,
            )
            # Unlock greeting gate on first TTS completion (= greeting finished)
            agent.end_greeting()
            if event.audio_duration_ms:
                await agent.send_custom_event({
                    "type": "tts_audio_info",
                    "duration_ms": event.audio_duration_ms,
                })

        @agent.tts.events.subscribe
        async def on_tts_error(event: TTSErrorEvent):
            logger.error("TTS ERROR: %s", event.error_message)
            # Safety net: unlock gate even if TTS fails
            agent.end_greeting()

    return agent


async def _subscribe_end_interview(current_agent: CandidAIAgent) -> None:
    """Wait for the coordinator WebSocket, then subscribe to end_interview custom events.

    The coordinator WS is connected asynchronously after join(). This task
    polls until it's available (up to 15s), then hooks into the event stream.
    Best-effort: the 20s frontend fallback covers us if this doesn't work.
    """
    edge = current_agent.edge
    connection = getattr(edge, "_real_connection", None)
    if connection is None:
        logger.warning("No RTC connection on edge — cannot subscribe to end_interview")
        return

    # Wait for coordinator WS to connect (it starts as a fire-and-forget task)
    for _ in range(30):
        ws_client = getattr(connection, "_coordinator_ws_client", None)
        if ws_client is not None:
            break
        await asyncio.sleep(0.5)
    else:
        logger.warning("Coordinator WS not available after 15s — end_interview signal won't be captured")
        return

    end_interview_handled = False

    async def on_coordinator_event(event_type: str, data) -> None:
        nonlocal end_interview_handled
        if event_type != "custom" or end_interview_handled:
            return
        custom_data = data.get("custom", {}) if isinstance(data, dict) else {}
        if custom_data.get("type") != "end_interview":
            return

        end_interview_handled = True
        logger.info("Received end_interview signal from frontend — triggering report generation")
        try:
            await current_agent.simple_response(
                "The candidate has ended the interview. You MUST immediately: "
                "1) Call score_response() for each dimension you evaluated during this interview. "
                "2) Then call generate_report() with your final assessment including overall_score, "
                "recommendation, strengths, and improvements. Do NOT speak to the candidate — "
                "just call the tools silently."
            )
        except Exception:
            logger.exception("Failed to trigger report generation on end_interview")

    ws_client.on_wildcard("*", on_coordinator_event)
    logger.info("Subscribed to coordinator custom events for end_interview")


async def join_call(agent: Agent, call_type: str, call_id: str, **kwargs) -> None:
    """Join a video call and run until it ends.

    Retries on SFU 'participant not found' errors which happen when the
    agent process restarts and the SFU hasn't cleaned up the old session yet.
    Each retry creates a FRESH agent because agent.join() closes the agent on
    failure (a closed agent cannot be reused).
    """
    timeout = int(os.getenv("CANDIDAI_CALL_TIMEOUT", "3600"))
    max_join_retries = 5
    current_agent = agent

    for attempt in range(max_join_retries):
        try:
            await current_agent.create_user()
            call = await current_agent.create_call(call_type, call_id)
            async with current_agent.join(call):
                # Subscribe to end_interview custom events (best-effort)
                end_interview_task = asyncio.create_task(
                    _subscribe_end_interview(current_agent),
                    name="end-interview-subscriber",
                )

                # Lock gate BEFORE greeting — unlocked by TTSSynthesisCompleteEvent
                current_agent.begin_greeting()
                await current_agent.simple_response(
                    "Greet the candidate briefly and ask their language preference (Python, JavaScript, Java, or C++). Use set_expression('smile')."
                )
                try:
                    await asyncio.wait_for(
                        current_agent.finish(), timeout=timeout
                    )
                except asyncio.TimeoutError:
                    logger.warning(
                        "Call timed out after %d seconds, disconnecting",
                        timeout,
                    )
                finally:
                    end_interview_task.cancel()
            return  # Clean exit
        except Exception as join_err:
            error_str = str(join_err).lower()
            is_retryable = (
                "participant not found" in error_str
                or "sfu rpc error" in error_str
            )
            if is_retryable and attempt < max_join_retries - 1:
                wait_s = 3 * (attempt + 1)
                logger.warning(
                    "Join failed (attempt %d/%d): %s — creating fresh agent in %ds",
                    attempt + 1, max_join_retries, join_err, wait_s,
                )
                # Clean up the dead agent's RAG connection
                pg_rag = getattr(current_agent, "_pg_rag", None)
                if pg_rag:
                    await pg_rag.close()
                await asyncio.sleep(wait_s)
                # Create a brand new agent (old one is closed/dead)
                current_agent = await create_agent()
                continue
            logger.exception(
                "Join failed after %d attempts, giving up", attempt + 1
            )
            # Clean up before raising
            pg_rag = getattr(current_agent, "_pg_rag", None)
            if pg_rag:
                await pg_rag.close()
            raise


if __name__ == "__main__":
    Runner(
        AgentLauncher(
            create_agent=create_agent,
            join_call=join_call,
        )
    ).cli()
