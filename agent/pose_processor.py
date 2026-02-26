"""
CandidAI Pose Processor

Single VideoProcessorPublisher that:
  1. Runs YOLO pose estimation on the candidate's video
  2. Draws skeleton overlay (green keypoints, blue bones, red wrists)
     and publishes the annotated video back to the call
  3. Computes body language metrics (posture, fidgeting, eye contact)
     and emits BodyLanguageEvent every 3 seconds
"""

import asyncio
import logging
import time
from collections import deque
from concurrent.futures import ThreadPoolExecutor
from typing import Any, Optional

import aiortc
import av
import cv2
import numpy as np

from vision_agents.core.events.manager import EventManager
from vision_agents.core.processors.base_processor import VideoProcessorPublisher
from vision_agents.core.utils.video_forwarder import VideoForwarder
from vision_agents.core.utils.video_track import QueuedVideoTrack
from vision_agents.core.warmup import Warmable

from events import BodyLanguageEvent

logger = logging.getLogger(__name__)

# COCO 17-keypoint indices
NOSE = 0
LEFT_EYE = 1
RIGHT_EYE = 2
LEFT_SHOULDER = 5
RIGHT_SHOULDER = 6
LEFT_WRIST = 9
RIGHT_WRIST = 10

# Skeleton connections (COCO 17)
SKELETON_CONNECTIONS = [
    (0, 1), (0, 2), (1, 3), (2, 4),       # head
    (5, 6), (5, 7), (7, 9), (6, 8), (8, 10),  # arms
    (5, 11), (6, 12), (11, 12),            # torso
    (11, 13), (13, 15), (12, 14), (14, 16),    # legs
]

EMIT_INTERVAL = 3.0


class PoseProcessor(VideoProcessorPublisher, Warmable[Any]):
    """
    Processes the candidate's video to extract pose keypoints, draw skeleton
    overlay, and derive body language metrics for the interviewer agent.
    """

    name = "pose_processor"

    def __init__(self, fps: int = 15, metrics_fps: int = 2, buffer_size: int = 30):
        self.fps = fps
        self._metrics_fps = metrics_fps
        self._buffer_size = buffer_size
        self._model = None
        self._video_forwarder: Optional[VideoForwarder] = None
        self._shutdown = False

        # Outgoing annotated video track
        self._video_track = QueuedVideoTrack()

        # Frame buffer for computing movement variance (fidgeting)
        self._keypoint_buffer: deque[np.ndarray] = deque(maxlen=buffer_size)

        # Current metrics
        self._posture_score: float = 0.0
        self._fidgeting_level: float = 0.0
        self._eye_contact_score: float = 0.0
        self._last_emit_time: float = 0.0

        # Throttle metrics computation (don't need it at 15fps)
        self._last_metrics_time: float = 0.0
        self._metrics_interval: float = 1.0 / metrics_fps

        # Thread pool for CPU-intensive YOLO inference
        self._executor = ThreadPoolExecutor(
            max_workers=4, thread_name_prefix="pose_processor"
        )

        # Event system
        self.events = EventManager()
        self.events.register(BodyLanguageEvent)

        logger.info(
            "PoseProcessor initialized (fps=%d, metrics_fps=%d, buffer=%d)",
            fps, metrics_fps, buffer_size,
        )

    # ── Warmable ──

    async def on_warmup(self) -> Any:
        """Load the YOLO pose model."""
        try:
            from ultralytics import YOLO

            logger.info("Loading YOLO pose model: yolo11n-pose.pt ...")
            model = YOLO("yolo11n-pose.pt")
            logger.info("YOLO pose model loaded successfully")
            return model
        except Exception:
            logger.exception("Failed to load YOLO pose model during warmup")
            raise

    def on_warmed_up(self, resource: Any) -> None:
        self._model = resource
        logger.info("PoseProcessor warmed up — model ready for inference")

    # ── VideoProcessorPublisher ──

    def publish_video_track(self) -> aiortc.VideoStreamTrack:
        """Return the outgoing annotated video track."""
        return self._video_track

    async def process_video(
        self,
        track: aiortc.VideoStreamTrack,
        participant_id: Optional[str],
        shared_forwarder: Optional[VideoForwarder] = None,
    ) -> None:
        if self._video_forwarder is not None:
            logger.info("Stopping previous pose processing for new track")
            await self._video_forwarder.remove_frame_handler(self._on_frame)

        logger.info(
            "Starting pose processing at %d FPS (track=%s, shared_forwarder=%s, track.readyState=%s)",
            self.fps, type(track).__name__, shared_forwarder is not None,
            getattr(track, 'readyState', 'unknown'),
        )
        self._video_forwarder = (
            shared_forwarder
            if shared_forwarder
            else VideoForwarder(
                track,
                max_buffer=self.fps,
                fps=self.fps,
                name="pose_forwarder",
            )
        )
        logger.info("VideoForwarder ready, adding frame handler (started=%s)", self._video_forwarder.started)
        self._video_forwarder.add_frame_handler(
            self._on_frame, fps=float(self.fps), name="pose"
        )
        logger.info("Frame handler added, forwarder started=%s", self._video_forwarder.started)

    _frame_count = 0

    async def _on_frame(self, frame: av.VideoFrame) -> None:
        """Process a single video frame: run YOLO, draw skeleton, compute metrics."""
        self._frame_count += 1
        if self._frame_count <= 3 or self._frame_count % 100 == 0:
            logger.info("_on_frame called: frame #%d, size=%dx%d", self._frame_count, frame.width, frame.height)
        if self._shutdown or self._model is None:
            await self._video_track.add_frame(frame)
            return

        try:
            frame_array = frame.to_ndarray(format="rgb24")
            loop = asyncio.get_running_loop()
            result = await asyncio.wait_for(
                loop.run_in_executor(
                    self._executor, self._process_frame, frame_array
                ),
                timeout=5.0,
            )

            if result is not None:
                annotated_array, keypoints = result

                # Publish annotated frame
                annotated_frame = av.VideoFrame.from_ndarray(annotated_array, format="rgb24")
                await self._video_track.add_frame(annotated_frame)

                # Compute body language metrics (throttled)
                if keypoints is not None:
                    now = time.time()
                    if now - self._last_metrics_time >= self._metrics_interval:
                        self._last_metrics_time = now
                        self._keypoint_buffer.append(keypoints)
                        frame_h, frame_w = frame_array.shape[:2]
                        self._compute_metrics(keypoints, frame_w, frame_h)

                    # Emit event periodically
                    if now - self._last_emit_time >= EMIT_INTERVAL:
                        self._last_emit_time = now
                        logger.info(
                            "Emitting BodyLanguageEvent: posture=%.3f fidgeting=%.3f eye_contact=%.3f",
                            self._posture_score, self._fidgeting_level, self._eye_contact_score,
                        )
                        self.events.send(BodyLanguageEvent(
                            posture_score=round(self._posture_score, 3),
                            fidgeting_level=round(self._fidgeting_level, 3),
                            eye_contact_score=round(self._eye_contact_score, 3),
                        ))
                else:
                    if self._frame_count <= 5 or self._frame_count % 100 == 0:
                        logger.info("Frame #%d: no keypoints detected", self._frame_count)
            else:
                if self._frame_count <= 5 or self._frame_count % 100 == 0:
                    logger.info("Frame #%d: _process_frame returned None", self._frame_count)
                await self._video_track.add_frame(frame)

        except asyncio.TimeoutError:
            logger.warning("Pose inference timed out")
            await self._video_track.add_frame(frame)
        except Exception:
            logger.exception("Frame processing failed")
            await self._video_track.add_frame(frame)

    # ── YOLO inference + annotation ──

    def _process_frame(
        self, frame_array: np.ndarray
    ) -> Optional[tuple[np.ndarray, Optional[np.ndarray]]]:
        """Run YOLO, draw skeleton, return (annotated_frame_rgb, keypoints)."""
        results = self._model(frame_array, verbose=False, conf=0.5, device="cpu")
        if not results:
            return frame_array, None

        # Convert RGB → BGR for OpenCV drawing (cv2 uses BGR color order)
        annotated = cv2.cvtColor(frame_array.copy(), cv2.COLOR_RGB2BGR)
        first_kpts = None

        for result in results:
            if result.keypoints is None or len(result.keypoints.data) == 0:
                continue

            kpts = result.keypoints.data[0].cpu().numpy()
            if first_kpts is None:
                first_kpts = kpts

            # Draw keypoints (green dots)
            for i, (x, y, conf) in enumerate(kpts):
                if conf > 0.5:
                    cv2.circle(annotated, (int(x), int(y)), 5, (0, 255, 0), -1)

            # Draw skeleton (blue lines)
            for start_idx, end_idx in SKELETON_CONNECTIONS:
                if start_idx < len(kpts) and end_idx < len(kpts):
                    x1, y1, c1 = kpts[start_idx]
                    x2, y2, c2 = kpts[end_idx]
                    if c1 > 0.5 and c2 > 0.5:
                        cv2.line(
                            annotated,
                            (int(x1), int(y1)),
                            (int(x2), int(y2)),
                            (255, 0, 0),  # blue in BGR
                            2,
                        )

            # Highlight wrists (red circles + white outline)
            for wrist_idx in [LEFT_WRIST, RIGHT_WRIST]:
                if wrist_idx < len(kpts):
                    x, y, conf = kpts[wrist_idx]
                    if conf > 0.5:
                        cv2.circle(annotated, (int(x), int(y)), 8, (0, 0, 255), -1)
                        cv2.circle(annotated, (int(x), int(y)), 10, (255, 255, 255), 2)

        # Convert BGR → RGB for av.VideoFrame
        annotated_rgb = cv2.cvtColor(annotated, cv2.COLOR_BGR2RGB)
        return annotated_rgb, first_kpts

    # ── Body language metrics ──

    def _compute_metrics(
        self, kpts: np.ndarray, frame_w: int, frame_h: int
    ) -> None:
        if kpts.shape[0] < 11:
            return

        # Posture score: shoulder alignment (0=slouching, 1=perfect)
        shoulder_conf = min(float(kpts[LEFT_SHOULDER, 2]), float(kpts[RIGHT_SHOULDER, 2]))
        if shoulder_conf > 0.3:
            shoulder_width = abs(float(kpts[RIGHT_SHOULDER, 0] - kpts[LEFT_SHOULDER, 0]))
            if shoulder_width > 1.0:
                y_diff = abs(float(kpts[LEFT_SHOULDER, 1] - kpts[RIGHT_SHOULDER, 1]))
                self._posture_score = max(0.0, min(1.0, 1.0 - (y_diff / shoulder_width) * 3.0))

        # Fidgeting level: wrist movement variance over buffer
        if len(self._keypoint_buffer) >= 5:
            recent = list(self._keypoint_buffer)[-10:]
            total_variance = 0.0
            count = 0
            for wrist_idx in [LEFT_WRIST, RIGHT_WRIST]:
                positions = [
                    kp[wrist_idx, :2]
                    for kp in recent
                    if kp.shape[0] > wrist_idx and float(kp[wrist_idx, 2]) > 0.3
                ]
                if len(positions) >= 3:
                    arr = np.array(positions)
                    total_variance += float(np.var(arr[:, 0]) + np.var(arr[:, 1]))
                    count += 1
            if count > 0:
                self._fidgeting_level = max(0.0, min(1.0, (total_variance / count) / 5000.0))

        # Eye contact score: nose position relative to frame center
        if float(kpts[NOSE, 2]) > 0.3:
            center_x, center_y = frame_w / 2.0, frame_h / 2.0
            x_off = abs(float(kpts[NOSE, 0]) - center_x) / center_x
            y_off = abs(float(kpts[NOSE, 1]) - center_y) / center_y
            self._eye_contact_score = max(0.0, min(1.0, 1.0 - (x_off * 0.6 + y_off * 0.4)))

    def state(self) -> dict[str, Any]:
        return {
            "posture_score": round(self._posture_score, 3),
            "fidgeting_level": round(self._fidgeting_level, 3),
            "eye_contact_score": round(self._eye_contact_score, 3),
            "frames_buffered": len(self._keypoint_buffer),
        }

    async def stop_processing(self) -> None:
        if self._video_forwarder is not None:
            await self._video_forwarder.remove_frame_handler(self._on_frame)
            self._video_forwarder = None
            logger.info("Stopped pose processing")

    async def close(self) -> None:
        self._shutdown = True
        await self.stop_processing()
        self._keypoint_buffer.clear()
        self._executor.shutdown(wait=False)
        logger.info("PoseProcessor closed")
