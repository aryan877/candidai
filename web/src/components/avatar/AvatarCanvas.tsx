"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useSpring } from "framer-motion";
import { expressions } from "./AvatarExpressions";

interface AvatarCanvasProps {
  expression: string;
  intensity: number;
  isSpeaking: boolean;
  action: string | null;
  actionIntensity?: number;
  onActionComplete?: () => void;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export default function AvatarCanvas({
  expression,
  intensity,
  isSpeaking,
  action,
  actionIntensity = 0.7,
  onActionComplete,
}: AvatarCanvasProps) {
  const cfg = expressions[expression] ?? expressions.neutral;
  const n = expressions.neutral;

  // Interpolate ALL 12 expression properties
  const headTilt = lerp(n.headTilt, cfg.headTilt, intensity);
  const mouthSmile = lerp(n.mouthSmile, cfg.mouthSmile, intensity);
  const mouthOpen = lerp(n.mouthOpen, cfg.mouthOpen, intensity);
  const mouthWidth = lerp(n.mouthWidth, cfg.mouthWidth, intensity);
  const eyeOpenness = lerp(n.eyeOpenness, cfg.eyeOpenness, intensity);
  const eyebrowY = lerp(n.eyebrowY, cfg.eyebrowY, intensity);
  const eyebrowTilt = lerp(n.eyebrowTilt, cfg.eyebrowTilt, intensity);
  const pupilX = lerp(n.pupilX, cfg.pupilX, intensity);
  const pupilY = lerp(n.pupilY, cfg.pupilY, intensity);
  const pupilSize = lerp(n.pupilSize, cfg.pupilSize, intensity);
  const cheekBlush = lerp(n.cheekBlush, cfg.cheekBlush, intensity);
  const upperLidDroop = lerp(n.upperLidDroop, cfg.upperLidDroop, intensity);

  /* ── Blinking ── */
  const [blinkClose, setBlinkClose] = useState(0);
  useEffect(() => {
    const doBlink = () => {
      setBlinkClose(1);
      setTimeout(() => setBlinkClose(0), 120);
    };
    const schedule = (): ReturnType<typeof setTimeout> => {
      const delay = 2800 + Math.random() * 2200;
      return setTimeout(() => {
        doBlink();
        timer = schedule();
      }, delay);
    };
    let timer = schedule();
    return () => clearTimeout(timer);
  }, []);

  /* ── Lip sync ── */
  const [speakPulse, setSpeakPulse] = useState(0);
  const speakRaf = useRef(0);
  useEffect(() => {
    if (!isSpeaking) {
      setSpeakPulse(0);
      return;
    }
    const t0 = performance.now();
    const tick = (now: number) => {
      const e = now - t0;
      const v =
        Math.abs(Math.sin(e * 0.012)) * 0.4 +
        Math.abs(Math.sin(e * 0.027)) * 0.15 +
        Math.sin(e * 0.053) * 0.08;
      setSpeakPulse(Math.max(0, v));
      speakRaf.current = requestAnimationFrame(tick);
    };
    speakRaf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(speakRaf.current);
  }, [isSpeaking]);

  /* ── Nodding ── */
  const [nodOff, setNodOff] = useState(0);
  useEffect(() => {
    if (action !== "nod") return;
    let count = 0;
    const iv = setInterval(() => {
      setNodOff((p) => (p === 0 ? 4 : 0));
      if (++count >= 6) {
        clearInterval(iv);
        setNodOff(0);
        onActionComplete?.();
      }
    }, 220);
    return () => clearInterval(iv);
  }, [action, onActionComplete]);

  /* ── Raise eyebrows action ── */
  const [browActionOffset, setBrowActionOffset] = useState(0);
  useEffect(() => {
    if (action !== "raise_eyebrows") return;
    setBrowActionOffset(-8 * actionIntensity);
    const t = setTimeout(() => {
      setBrowActionOffset(0);
      onActionComplete?.();
    }, 600);
    return () => {
      clearTimeout(t);
      setBrowActionOffset(0);
    };
  }, [action, actionIntensity, onActionComplete]);

  /* ── Breathing ── */
  const [breath, setBreath] = useState(1);
  useEffect(() => {
    const t0 = performance.now();
    let raf: number;
    const tick = (now: number) => {
      setBreath(1 + Math.sin((now - t0) * 0.0016) * 0.005);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  /* ── Head spring ── */
  const headSpring = useSpring(headTilt + nodOff, {
    stiffness: 120,
    damping: 15,
  });
  useEffect(() => {
    headSpring.set(headTilt + nodOff);
  }, [headTilt, nodOff, headSpring]);

  /* ── Computed mouth geometry (293.41x400 viewBox) ── */
  const mouthCx = 137;
  const mouthCy = 199;
  const halfW = 22 * mouthWidth;
  const smileCurve = mouthSmile * 14;
  const openAmount = Math.min(mouthOpen + speakPulse, 1) * 18;
  const showTeeth = openAmount > 3;

  // Mouth corners pull up with smile
  const cornerLift = smileCurve * 0.4;

  const upperLipPath = `M ${mouthCx - halfW} ${mouthCy - cornerLift}
    Q ${mouthCx - halfW * 0.35} ${mouthCy - smileCurve - 3} ${mouthCx} ${mouthCy - smileCurve - 1}
    Q ${mouthCx + halfW * 0.35} ${mouthCy - smileCurve - 3} ${mouthCx + halfW} ${mouthCy - cornerLift}`;

  const lowerLipPath = `M ${mouthCx - halfW} ${mouthCy - cornerLift}
    Q ${mouthCx} ${mouthCy + Math.max(openAmount, smileCurve * 0.3) + 5} ${mouthCx + halfW} ${mouthCy - cornerLift}`;

  /* ── Eye geometry ── */
  const leftEyeCx = 104;
  const rightEyeCx = 170;
  const eyeCy = 147;
  const eyeRx = 20;
  const eyeRy = 14;

  const effectiveOpen = blinkClose > 0 ? 0 : Math.min(eyeOpenness, 1.3);
  const eyeClosedAmount = 1 - Math.min(effectiveOpen, 1);

  // Upper lid droop: covers top portion of eye
  const lidDroopHeight = upperLidDroop * eyeRy * 1.5;

  // Pupil positions (offset from eye center)
  const pupilOffX = pupilX * 6;
  const pupilOffY = pupilY * 4;
  const pupilR = 4 * pupilSize;

  /* ── Eyebrow geometry ── */
  const browBaseY = 128;
  const browY = browBaseY + eyebrowY + browActionOffset;
  // Left brow tilts opposite to right for asymmetric expressions
  const leftBrowTilt = -eyebrowTilt * 0.5;
  const rightBrowTilt = eyebrowTilt * 0.5;

  return (
    <div className="flex flex-col items-center justify-center">
      <motion.div
        className="relative w-full max-w-[280px]"
        style={{ scale: breath }}
      >
        <motion.div
          style={{ rotate: headSpring, transformOrigin: "50% 35%" }}
        >
          {/* Base illustrated avatar */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/370748059_3bab5cfd-4948-44f4-a0fc-969bb018b8dc.svg"
            alt="AI Interviewer"
            className="w-full select-none"
            draggable={false}
          />

          {/* Animation overlay — same coordinate space as illustration */}
          <svg
            viewBox="0 0 293.41 400"
            className="pointer-events-none absolute inset-0 h-full w-full"
            aria-hidden
          >
            <defs>
              <clipPath id="leftEyeClip">
                <ellipse cx={leftEyeCx} cy={eyeCy} rx={eyeRx} ry={eyeRy} />
              </clipPath>
              <clipPath id="rightEyeClip">
                <ellipse cx={rightEyeCx} cy={eyeCy} rx={eyeRx} ry={eyeRy} />
              </clipPath>
              <clipPath id="mouthClip">
                <ellipse
                  cx={mouthCx}
                  cy={mouthCy + 2}
                  rx={halfW + 3}
                  ry={Math.max(openAmount, 3) + 3}
                />
              </clipPath>
              <linearGradient id="lipGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#E8737D" />
                <stop offset="100%" stopColor="#D45B65" />
              </linearGradient>
              <radialGradient id="blushGrad">
                <stop offset="0%" stopColor="#F5A0A0" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#F5A0A0" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* ═══ Cheek blush ═══ */}
            {cheekBlush > 0.01 && (
              <g opacity={cheekBlush}>
                <circle cx={88} cy={175} r={18} fill="url(#blushGrad)" />
                <circle cx={186} cy={175} r={18} fill="url(#blushGrad)" />
              </g>
            )}

            {/* ═══ Eyebrows ═══ */}
            <g>
              {/* Left eyebrow */}
              <path
                d={`M ${leftEyeCx - 18} ${browY + 2}
                    Q ${leftEyeCx} ${browY - 4} ${leftEyeCx + 16} ${browY + 1}`}
                stroke="#3D2215"
                strokeWidth="2.8"
                strokeLinecap="round"
                fill="none"
                transform={`rotate(${leftBrowTilt}, ${leftEyeCx}, ${browY})`}
              />
              {/* Right eyebrow */}
              <path
                d={`M ${rightEyeCx - 16} ${browY + 1}
                    Q ${rightEyeCx} ${browY - 4} ${rightEyeCx + 18} ${browY + 2}`}
                stroke="#3D2215"
                strokeWidth="2.8"
                strokeLinecap="round"
                fill="none"
                transform={`rotate(${rightBrowTilt}, ${rightEyeCx}, ${browY})`}
              />
            </g>

            {/* ═══ Eye blink / squint overlays ═══ */}
            {eyeClosedAmount > 0.02 && (
              <g>
                <rect
                  x={leftEyeCx - eyeRx}
                  y={eyeCy - eyeRy}
                  width={eyeRx * 2}
                  height={eyeClosedAmount * eyeRy * 2}
                  fill="#FED09E"
                  clipPath="url(#leftEyeClip)"
                />
                {eyeClosedAmount > 0.7 && (
                  <line
                    x1={leftEyeCx - eyeRx + 3}
                    y1={eyeCy - eyeRy + eyeClosedAmount * eyeRy * 2 - 1}
                    x2={leftEyeCx + eyeRx - 3}
                    y2={eyeCy - eyeRy + eyeClosedAmount * eyeRy * 2 - 1}
                    stroke="#3D2215"
                    strokeWidth="1.3"
                    strokeLinecap="round"
                    opacity={Math.min((eyeClosedAmount - 0.7) * 3.3, 1)}
                  />
                )}
                <rect
                  x={rightEyeCx - eyeRx}
                  y={eyeCy - eyeRy}
                  width={eyeRx * 2}
                  height={eyeClosedAmount * eyeRy * 2}
                  fill="#FED09E"
                  clipPath="url(#rightEyeClip)"
                />
                {eyeClosedAmount > 0.7 && (
                  <line
                    x1={rightEyeCx - eyeRx + 3}
                    y1={eyeCy - eyeRy + eyeClosedAmount * eyeRy * 2 - 1}
                    x2={rightEyeCx + eyeRx - 3}
                    y2={eyeCy - eyeRy + eyeClosedAmount * eyeRy * 2 - 1}
                    stroke="#3D2215"
                    strokeWidth="1.3"
                    strokeLinecap="round"
                    opacity={Math.min((eyeClosedAmount - 0.7) * 3.3, 1)}
                  />
                )}
              </g>
            )}

            {/* ═══ Upper lid droop (thinking/concerned) ═══ */}
            {lidDroopHeight > 0.5 && eyeClosedAmount < 0.5 && (
              <g>
                <rect
                  x={leftEyeCx - eyeRx}
                  y={eyeCy - eyeRy}
                  width={eyeRx * 2}
                  height={lidDroopHeight}
                  fill="#FED09E"
                  clipPath="url(#leftEyeClip)"
                />
                <rect
                  x={rightEyeCx - eyeRx}
                  y={eyeCy - eyeRy}
                  width={eyeRx * 2}
                  height={lidDroopHeight}
                  fill="#FED09E"
                  clipPath="url(#rightEyeClip)"
                />
              </g>
            )}

            {/* ═══ Pupil gaze direction ═══ */}
            {eyeClosedAmount < 0.6 && (
              <g>
                <circle
                  cx={leftEyeCx + pupilOffX}
                  cy={eyeCy + pupilOffY}
                  r={pupilR}
                  fill="#2A1509"
                />
                <circle
                  cx={leftEyeCx + pupilOffX + 1.5}
                  cy={eyeCy + pupilOffY - 1.5}
                  r={1.2}
                  fill="white"
                  opacity={0.7}
                />
                <circle
                  cx={rightEyeCx + pupilOffX}
                  cy={eyeCy + pupilOffY}
                  r={pupilR}
                  fill="#2A1509"
                />
                <circle
                  cx={rightEyeCx + pupilOffX + 1.5}
                  cy={eyeCy + pupilOffY - 1.5}
                  r={1.2}
                  fill="white"
                  opacity={0.7}
                />
              </g>
            )}

            {/* ═══ Animated mouth overlay ═══ */}
            <g>
              {/* Cover original static mouth with skin color */}
              <ellipse cx={mouthCx} cy="202" rx="28" ry="18" fill="#FED09E" />

              {/* Teeth (visible when mouth opens) */}
              {showTeeth && (
                <g clipPath="url(#mouthClip)">
                  <rect
                    x={mouthCx - halfW * 0.55}
                    y={mouthCy - 1}
                    width={halfW * 1.1}
                    height={openAmount * 0.6 + 2}
                    rx="2"
                    fill="#F8F4F0"
                  />
                </g>
              )}

              {/* Upper lip */}
              <path
                d={upperLipPath}
                stroke="#C85060"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />

              {/* Lower lip with fill */}
              <path
                d={lowerLipPath}
                stroke="#D45B65"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="url(#lipGrad)"
                fillOpacity={openAmount > 1 ? 0.85 : 0.5}
              />

              {/* Mouth corner dimples for smile */}
              {smileCurve > 3 && (
                <g opacity={Math.min(smileCurve / 10, 0.6)}>
                  <circle cx={mouthCx - halfW - 2} cy={mouthCy - cornerLift + 1} r={1.5} fill="#D4956E" />
                  <circle cx={mouthCx + halfW + 2} cy={mouthCy - cornerLift + 1} r={1.5} fill="#D4956E" />
                </g>
              )}
            </g>
          </svg>
        </motion.div>
      </motion.div>

      {/* Speaking audio visualizer */}
      {isSpeaking && (
        <div className="mt-2 flex h-4 items-end justify-center gap-[3px]">
          {[0.3, 0.65, 1, 0.65, 0.3].map((scale, i) => (
            <div
              key={i}
              className="w-[3px] rounded-full bg-zinc-400/60"
              style={{
                height: `${3 + speakPulse * scale * 13}px`,
                transition: "height 75ms ease-out",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
