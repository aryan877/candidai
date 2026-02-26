"""OpenAI GPT-5.2 VLM — ChatCompletionsVLM + tool calling.

Combines video frame buffering (from ChatCompletionsVLM) with OpenAI's GPT-5.2
tool calling support so the agent can both SEE the candidate's screen and code
in real-time while calling function tools (avatar expressions, scoring, etc.).

Uses OpenAI's latest GPT-5.2 model for crisp real-time code analysis and feedback at optimal cost.
"""

import asyncio
import json
import logging
import os
import time
from typing import Any, Dict, List, Optional, cast

from openai import AsyncStream
from openai.types.chat.chat_completion_chunk import ChatCompletionChunk
from vision_agents.core.llm.events import (
    LLMResponseChunkEvent,
    LLMResponseCompletedEvent,
    VLMInferenceStartEvent,
    VLMInferenceCompletedEvent,
    VLMErrorEvent,
)
from vision_agents.core.llm.llm import LLMResponseEvent
from vision_agents.core.llm.llm_types import NormalizedToolCallItem
from vision_agents.plugins.openai import ChatCompletionsVLM

logger = logging.getLogger(__name__)

PLUGIN_NAME = "openai_vlm"


class OpenRouterVLM(ChatCompletionsVLM):
    """ChatCompletionsVLM pointed at OpenAI's GPT-5.2-Pro with tool calling support.

    Inherits:
      - Video frame buffering + base64 JPEG encoding from ChatCompletionsVLM
      - Tool execution (_dedup_and_execute, _sanitize_tool_output) from base LLM

    Adds:
      - Tool schema formatting for Chat Completions API
      - Streaming tool call accumulation and execution
      - Multi-round tool call handling (up to 3 rounds)

    Uses OpenAI's latest GPT-5.2-Pro model for real-time vision analysis of code.
    """

    def __init__(
        self,
        *,
        model: str = "gpt-5.2",
        api_key: str | None = None,
        base_url: str = "https://api.openai.com/v1",
        fps: int = 1,
        frame_buffer_seconds: int = 5,
        frame_width: int = 1280,
        frame_height: int = 720,
        max_workers: int = 4,
    ) -> None:
        if api_key is None:
            api_key = os.environ.get("OPENAI_API_KEY")
        super().__init__(
            model=model,
            api_key=api_key,
            base_url=base_url,
            fps=fps,
            frame_buffer_seconds=frame_buffer_seconds,
            frame_width=frame_width,
            frame_height=frame_height,
            max_workers=max_workers,
        )
        self._pending_tool_calls: Dict[int, Dict[str, Any]] = {}

    # ------------------------------------------------------------------
    # Override simple_response to add tool calling
    # ------------------------------------------------------------------

    async def simple_response(self, text, processors=None, participant=None):
        import uuid
        from vision_agents.core.agents.conversation import Message

        if self._conversation is None:
            logger.warning("Cannot respond — conversation not initialized")
            return LLMResponseEvent(original=None, text="")

        if participant is None:
            # Agent-initiated prompt (greeting, end-interview, etc.)
            await self._conversation.send_message(
                role="user", user_id="user", content=text
            )
        elif text and text.strip():
            # User turn: STT handler may have already added this, but there's a
            # race condition where _build_model_request runs before the STT
            # handler's upsert_message completes.  Always add to guarantee the
            # user's speech is in the context.  Duplicate user messages are
            # harmless — the LLM handles consecutive user turns fine.
            user_id = participant.user_id if hasattr(participant, "user_id") else "user"
            await self._conversation.send_message(
                role="user", user_id=user_id, content=text.strip()
            )

        # Build messages with frames
        messages = await self._build_model_request()

        # Build tools - OpenAI GPT-5.2 requires all params in required array
        tools_param = None
        tools_spec = self.get_available_functions()
        if tools_spec:
            tools_param = self._format_tools(tools_spec)

        frames_count = len(self._frame_buffer)
        inference_id = str(uuid.uuid4())

        # Count image content in messages
        image_count = sum(
            1 for m in messages if isinstance(m.get("content"), list)
            for item in (m["content"] if isinstance(m.get("content"), list) else [])
            if isinstance(item, dict) and item.get("type") == "image_url"
        )
        logger.info(
            "VLM request: frames_in_buffer=%d, images_in_request=%d, messages=%d, model=%s",
            frames_count, image_count, len(messages), self.model,
        )

        self.events.send(VLMInferenceStartEvent(
            plugin_name=PLUGIN_NAME,
            inference_id=inference_id,
            model=self.model,
            frames_count=frames_count,
        ))

        request_start = time.perf_counter()
        max_retries = 2

        for attempt in range(max_retries + 1):
            try:
                request_kwargs: Dict[str, Any] = {
                    "messages": messages,
                    "model": self.model,
                    "stream": True,
                }
                if tools_param:
                    request_kwargs["tools"] = tools_param

                response = await self._client.chat.completions.create(**request_kwargs)
                break
            except Exception as e:
                if attempt < max_retries:
                    logger.warning("VLM request failed (attempt %d/%d), retrying: %s", attempt + 1, max_retries + 1, e)
                    await asyncio.sleep(0.5)
                    continue
                logger.exception("VLM request failed after %d attempts", max_retries + 1)
                self.events.send(VLMErrorEvent(
                    plugin_name=PLUGIN_NAME,
                    inference_id=inference_id,
                    error=e,
                    context="api_request",
                ))
                return LLMResponseEvent(original=None, text="")

        # Process streaming response with tool call support
        result = await self._process_stream_with_tools(
            response, messages, tools_param, request_start, inference_id, frames_count
        )

        # Update conversation
        if self._conversation and result.text:
            self._conversation.messages.append(
                Message(
                    original={"role": "assistant", "content": result.text},
                    content=result.text,
                    role="assistant",
                )
            )

        return result

    # ------------------------------------------------------------------
    # Streaming + tool call processing
    # ------------------------------------------------------------------

    async def _process_stream_with_tools(
        self,
        response: Any,
        messages: List[Dict[str, Any]],
        tools: Optional[List[Dict[str, Any]]],
        request_start: float,
        inference_id: str,
        frames_count: int,
    ) -> LLMResponseEvent:
        first_token_time: Optional[float] = None
        text_chunks: list[str] = []
        self._pending_tool_calls = {}
        accumulated_tool_calls: List[NormalizedToolCallItem] = []
        has_tool_delta = False
        seq = 0
        llm_response = LLMResponseEvent(original=None, text="")

        async for chunk in cast(AsyncStream[ChatCompletionChunk], response):
            if not chunk.choices:
                continue
            choice = chunk.choices[0]
            content = choice.delta.content
            finish = choice.finish_reason

            if choice.delta.tool_calls:
                has_tool_delta = True
                for tc in choice.delta.tool_calls:
                    self._accumulate_tool_call(tc)

            if content:
                if first_token_time is None:
                    first_token_time = time.perf_counter()
                text_chunks.append(content)
                if not has_tool_delta:
                    is_first = seq == 0
                    ttft = (first_token_time - request_start) * 1000 if is_first else None
                    self.events.send(LLMResponseChunkEvent(
                        plugin_name=PLUGIN_NAME,
                        content_index=None,
                        item_id=chunk.id,
                        output_index=0,
                        sequence_number=seq,
                        delta=content,
                        is_first_chunk=is_first,
                        time_to_first_token_ms=ttft,
                    ))
                    seq += 1

            if finish == "tool_calls":
                accumulated_tool_calls = self._finalize_tool_calls()
            elif finish == "stop":
                total = "".join(text_chunks)
                latency = (time.perf_counter() - request_start) * 1000
                ttft_final = (first_token_time - request_start) * 1000 if first_token_time else None
                self.events.send(VLMInferenceCompletedEvent(
                    plugin_name=PLUGIN_NAME,
                    inference_id=inference_id,
                    model=self.model,
                    text=total,
                    latency_ms=latency,
                    frames_processed=frames_count,
                ))
                self.events.send(LLMResponseCompletedEvent(
                    plugin_name=PLUGIN_NAME,
                    original=chunk,
                    text=total,
                    item_id=chunk.id,
                    latency_ms=latency,
                    time_to_first_token_ms=ttft_final,
                    model=self.model,
                ))
                llm_response = LLMResponseEvent(original=chunk, text=total)

        if accumulated_tool_calls:
            return await self._handle_tool_calls(
                accumulated_tool_calls, messages, tools, inference_id, frames_count,
            )

        return llm_response

    # ------------------------------------------------------------------
    # Tool call execution (borrowed from OpenRouterLLM)
    # ------------------------------------------------------------------

    async def _handle_tool_calls(
        self,
        tool_calls: List[NormalizedToolCallItem],
        messages: List[Dict[str, Any]],
        tools: Optional[List[Dict[str, Any]]],
        inference_id: str,
        frames_count: int,
    ) -> LLMResponseEvent:
        max_rounds = 15
        current_tool_calls = tool_calls
        seen: set[tuple] = set()
        current_messages = list(messages)
        llm_response = LLMResponseEvent(original=None, text="")

        for round_num in range(max_rounds):
            triples, seen = await self._dedup_and_execute(
                current_tool_calls,  # type: ignore[arg-type]
                max_concurrency=8,
                timeout_s=30,
                seen=seen,
            )
            if not triples:
                break

            assistant_tool_calls = []
            tool_results = []
            for tc, res, err in triples:
                cid = tc.get("id")
                if not cid:
                    continue
                assistant_tool_calls.append({
                    "id": cid,
                    "type": "function",
                    "function": {
                        "name": tc["name"],
                        "arguments": json.dumps(tc.get("arguments_json", {})),
                    },
                })
                tool_results.append({
                    "role": "tool",
                    "tool_call_id": cid,
                    "content": self._sanitize_tool_output(
                        err if err is not None else res
                    ),
                })

            if not tool_results:
                return llm_response

            current_messages.append({
                "role": "assistant",
                "content": None,
                "tool_calls": assistant_tool_calls,
            })
            current_messages.extend(tool_results)

            # Follow-up request (with retry for SSL errors)
            request_kwargs: Dict[str, Any] = {
                "messages": current_messages,
                "model": self.model,
                "stream": True,
            }
            if tools:
                request_kwargs["tools"] = tools

            request_start = time.perf_counter()
            logger.info("Follow-up VLM request after tools (round %d/%d, messages=%d)", round_num + 1, max_rounds, len(current_messages))
            follow_up = None
            for attempt in range(3):
                try:
                    follow_up = await self._client.chat.completions.create(**request_kwargs)
                    break
                except Exception as e:
                    if attempt < 2:
                        logger.warning("Follow-up VLM request failed (attempt %d/3), retrying: %s", attempt + 1, e)
                        await asyncio.sleep(0.5)
                    else:
                        logger.exception("Follow-up VLM request failed after 3 attempts")
                        return llm_response
            if follow_up is None:
                return llm_response

            text_chunks: list[str] = []
            self._pending_tool_calls = {}
            next_tool_calls: List[NormalizedToolCallItem] = []
            has_tool_delta = False
            seq = 0

            async for chunk in cast(AsyncStream[ChatCompletionChunk], follow_up):
                if not chunk.choices:
                    continue
                choice = chunk.choices[0]
                content = choice.delta.content
                finish = choice.finish_reason

                if choice.delta.tool_calls:
                    has_tool_delta = True
                    for tc_delta in choice.delta.tool_calls:
                        self._accumulate_tool_call(tc_delta)

                if content:
                    text_chunks.append(content)
                    if not has_tool_delta:
                        self.events.send(LLMResponseChunkEvent(
                            plugin_name=PLUGIN_NAME,
                            content_index=None,
                            item_id=chunk.id,
                            output_index=0,
                            sequence_number=seq,
                            delta=content,
                        ))
                        seq += 1

                if finish == "tool_calls":
                    next_tool_calls = self._finalize_tool_calls()
                elif finish == "stop":
                    total = "".join(text_chunks)
                    latency = (time.perf_counter() - request_start) * 1000
                    self.events.send(LLMResponseCompletedEvent(
                        plugin_name=PLUGIN_NAME,
                        original=chunk,
                        text=total,
                        item_id=chunk.id,
                        latency_ms=latency,
                    ))
                    llm_response = LLMResponseEvent(original=chunk, text=total)

            if next_tool_calls and round_num < max_rounds - 1:
                current_tool_calls = next_tool_calls
                continue

            return llm_response

        return llm_response

    # ------------------------------------------------------------------
    # Tool call accumulation helpers
    # ------------------------------------------------------------------

    def _accumulate_tool_call(self, tc_chunk: Any) -> None:
        idx = tc_chunk.index
        if idx not in self._pending_tool_calls:
            self._pending_tool_calls[idx] = {
                "id": tc_chunk.id or "",
                "name": "",
                "arguments_parts": [],
            }
        pending = self._pending_tool_calls[idx]
        if tc_chunk.id:
            pending["id"] = tc_chunk.id
        if tc_chunk.function:
            if tc_chunk.function.name:
                pending["name"] = tc_chunk.function.name
            if tc_chunk.function.arguments:
                pending["arguments_parts"].append(tc_chunk.function.arguments)

    def _finalize_tool_calls(self) -> List[NormalizedToolCallItem]:
        tool_calls: List[NormalizedToolCallItem] = []
        for pending in self._pending_tool_calls.values():
            args_str = "".join(pending["arguments_parts"]).strip() or "{}"
            try:
                args = json.loads(args_str)
            except json.JSONDecodeError:
                logger.warning("Failed to parse tool call args: %s", args_str)
                args = {}
            tool_calls.append({
                "type": "tool_call",
                "id": pending["id"],
                "name": pending["name"],
                "arguments_json": args,
            })
        self._pending_tool_calls = {}
        return tool_calls

    def _format_tools(self, tools_spec) -> List[Dict[str, Any]]:
        """Format tool schemas for OpenAI's strict function calling.

        OpenAI requires:
          - ALL properties listed in 'required' array
          - Optional params must have null added to their type: ["number", "null"]
          - additionalProperties: false
          - strict: true
        The SDK only puts truly required params in 'required', so we
        patch optional ones to be nullable and add them to required.
        """
        result = []
        for t in tools_spec or []:
            name = t.get("name", "unnamed_tool")
            description = t.get("description", "") or ""
            raw_params = t.get("parameters_schema") or t.get("parameters") or {}
            if not isinstance(raw_params, dict):
                raw_params = {}

            # Deep copy so we don't mutate the SDK's cached schema
            import copy
            params = copy.deepcopy(raw_params)
            params.setdefault("type", "object")
            params.setdefault("properties", {})

            props = params.get("properties", {})
            existing_required = set(params.get("required", []))

            # For each property NOT in the original required list,
            # make it nullable by adding "null" to its type
            for prop_name, prop_schema in props.items():
                if prop_name not in existing_required:
                    current_type = prop_schema.get("type")
                    if current_type and current_type != "null":
                        if isinstance(current_type, list):
                            if "null" not in current_type:
                                prop_schema["type"] = current_type + ["null"]
                        else:
                            prop_schema["type"] = [current_type, "null"]

            # ALL properties must be in required
            params["required"] = list(props.keys())
            params["additionalProperties"] = False

            func_spec: Dict[str, Any] = {
                "name": name,
                "description": description,
                "parameters": params,
                "strict": True,
            }
            result.append({"type": "function", "function": func_spec})

            logger.debug(
                "Formatted tool %s: required=%s", name, params["required"]
            )
        return result
