"""Edge TTS — Free Microsoft neural text-to-speech.

Uses Microsoft's Edge TTS service (same neural voices as Azure Cognitive
Services) for completely free, high-quality speech synthesis.
No API key required. Zero cost.

Install: pip install edge-tts
"""

import io
import logging
from typing import AsyncIterator, Iterator

import av
import edge_tts
from getstream.video.rtc.track_util import AudioFormat, PcmData
from vision_agents.core import tts

logger = logging.getLogger(__name__)

# Edge TTS outputs MP3 at 24 kHz mono
_EDGE_SAMPLE_RATE = 24000


class TTS(tts.TTS):
    """Free TTS using Microsoft Edge's neural voice service."""

    def __init__(
        self,
        voice: str = "en-US-GuyNeural",
        rate: str = "+0%",
        pitch: str = "+0Hz",
        volume: str = "+0%",
    ):
        super().__init__(provider_name="edge_tts")
        self.voice = voice
        self.rate = rate
        self.pitch = pitch
        self.volume = volume

    async def stream_audio(
        self, text: str, *_, **__
    ) -> PcmData | Iterator[PcmData] | AsyncIterator[PcmData]:
        """Convert text to speech using edge-tts (free, no API key)."""
        communicate = edge_tts.Communicate(
            text,
            voice=self.voice,
            rate=self.rate,
            pitch=self.pitch,
            volume=self.volume,
        )

        mp3_chunks: list[bytes] = []
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                mp3_chunks.append(chunk["data"])

        if not mp3_chunks:
            raise RuntimeError("edge-tts returned no audio data")

        mp3_data = b"".join(mp3_chunks)
        pcm_bytes = _decode_mp3_to_pcm(mp3_data)

        return PcmData.from_bytes(
            pcm_bytes,
            sample_rate=_EDGE_SAMPLE_RATE,
            channels=1,
            format=AudioFormat.S16,
        )

    async def stop_audio(self) -> None:
        pass


def _decode_mp3_to_pcm(mp3_data: bytes) -> bytes:
    """Decode MP3 bytes to raw 16-bit mono PCM at 24 kHz using PyAV."""
    container = av.open(io.BytesIO(mp3_data), format="mp3")
    resampler = av.AudioResampler(
        format="s16",
        layout="mono",
        rate=_EDGE_SAMPLE_RATE,
    )
    pcm_parts: list[bytes] = []
    for frame in container.decode(audio=0):
        for resampled in resampler.resample(frame):
            pcm_parts.append(resampled.to_ndarray().tobytes())
    container.close()
    return b"".join(pcm_parts)
