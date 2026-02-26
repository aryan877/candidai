"""Custom event definitions for CandidAI agent pipeline."""

from dataclasses import dataclass, field

from vision_agents.core.events.base import PluginBaseEvent


@dataclass
class BodyLanguageEvent(PluginBaseEvent):
    """Emitted when body language metrics are computed from pose data."""
    type: str = field(default="candidai.body_language", init=False)
    posture_score: float = 0.0
    fidgeting_level: float = 0.0
    eye_contact_score: float = 0.0
    plugin_name: str = "pose_processor"
    plugin_version: str = "1.0.0"
