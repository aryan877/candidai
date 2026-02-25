import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Zap, Clock, Radio } from "lucide-react";

const features = [
  {
    icon: "/icons/ai-brain.png",
    title: "AI Interviewer",
    description:
      "Adaptive conversational AI that tailors questions in real-time based on your responses across technical, behavioral, and system design domains.",
  },
  {
    icon: "/icons/eye-scan.png",
    title: "Body Language Analysis",
    description:
      "YOLO-powered pose estimation tracks posture, eye contact, and fidgeting to give you actionable feedback on non-verbal communication.",
  },
  {
    icon: "/icons/report-chart.png",
    title: "Detailed Reports",
    description:
      "Comprehensive post-interview reports with radar charts, dimension scores, transcript review, and targeted improvement suggestions.",
  },
  {
    icon: "/icons/code-editor.png",
    title: "Code Challenges",
    description:
      "Live coding environment with Monaco editor. Write, run, and get AI-evaluated feedback on your solutions in real-time.",
  },
  {
    icon: "/icons/video-call.png",
    title: "Real-time Video",
    description:
      "WebRTC-powered video calls with sub-30ms latency via Stream. Face-to-face with your AI interviewer, just like the real thing.",
  },
  {
    icon: "/icons/shield-check.png",
    title: "Integrity Monitoring",
    description:
      "Continuous attention and engagement tracking ensures authentic interview practice with honest performance metrics.",
  },
];

const steps = [
  {
    number: "01",
    title: "Create",
    description: "Set up an interview session. Choose your focus area, difficulty level, and preferred interview style.",
  },
  {
    number: "02",
    title: "Interview",
    description: "Engage in a realistic AI-powered conversation with adaptive questions, live coding, and real-time feedback.",
  },
  {
    number: "03",
    title: "Report",
    description: "Receive a detailed analysis with scores across five dimensions, strengths, improvements, and a recommendation.",
  },
];

const techStack = [
  "Vision Agents SDK",
  "Stream Video",
  "OpenAI",
  "YOLO Pose",
  "Convex",
  "Next.js",
];

export default function HomePage() {
  return (
    <div className="noise-overlay relative min-h-screen overflow-x-hidden">
      {/* ──────────────── Navbar ──────────────── */}
      <nav className="fixed top-0 right-0 left-0 z-50 flex items-center justify-between border-b border-[#2a2a2a] bg-[#111111]/80 px-6 py-4 backdrop-blur-sm md:px-12">
        <Link href="/" className="flex items-center gap-0.5 text-xl font-bold tracking-tight">
          <span className="text-white">Candid</span>
          <span className="text-zinc-400">AI</span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          <a href="#features" className="text-sm text-zinc-500 transition-colors hover:text-zinc-200">
            Features
          </a>
          <a href="#how-it-works" className="text-sm text-zinc-500 transition-colors hover:text-zinc-200">
            How it Works
          </a>
          <a href="#tech-stack" className="text-sm text-zinc-500 transition-colors hover:text-zinc-200">
            Tech Stack
          </a>
        </div>

        <Link
          href="/sign-in"
          className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-200"
        >
          Get Started
          <ArrowRight className="h-4 w-4" />
        </Link>
      </nav>

      {/* ──────────────── Hero Section ──────────────── */}
      <section className="bg-grid-dots relative flex flex-col items-center justify-center px-6 pt-40 pb-24 text-center md:pt-48 md:pb-32">
        <div className="relative z-10 stagger-children flex flex-col items-center">
          {/* Pill badge */}
          <div className="group relative mb-8 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm text-zinc-300">
            {/* Static rainbow border */}
            <span
              className="absolute inset-0 rounded-full p-[1px]"
              style={{ background: "linear-gradient(90deg, #ff4545, #ff8c00, #ffd700, #7cff00, #00e5ff, #7b61ff, #ff6ec7, #ff4545)" }}
            >
              <span className="block h-full w-full rounded-full bg-[#111]" />
            </span>
            {/* Glow */}
            <span
              className="absolute inset-[-2px] -z-10 rounded-full opacity-25 blur-md"
              style={{ background: "linear-gradient(90deg, #ff4545, #ff8c00, #ffd700, #7cff00, #00e5ff, #7b61ff, #ff6ec7, #ff4545)" }}
            />
            <Zap className="relative z-10 h-3.5 w-3.5 text-yellow-400" />
            <span className="relative z-10">Built for Vision Possible Hackathon</span>
          </div>

          {/* Headline */}
          <h1 className="max-w-4xl text-5xl font-bold tracking-tight text-white sm:text-6xl lg:text-7xl">
            The future of{" "}
            <span className="text-zinc-300">technical interviews</span>
          </h1>

          {/* Subtitle */}
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-zinc-500">
            An AI-powered mock interviewer that conducts realistic technical interviews, analyzes your
            body language in real-time, evaluates live code, and delivers comprehensive performance reports.
          </p>

          {/* CTA buttons */}
          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <Link
              href="/sign-in"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-8 py-3.5 text-sm font-semibold text-zinc-900 transition-colors hover:bg-zinc-200"
            >
              Start Interview
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/sign-in"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#2a2a2a] bg-[#181818] px-8 py-3.5 text-sm font-semibold text-zinc-300 transition-colors hover:border-[#3a3a3a] hover:bg-[#1e1e1e]"
            >
              Watch Demo
            </Link>
          </div>
        </div>
      </section>

      {/* ──────────────── Stats Bar ──────────────── */}
      <section className="relative mx-auto max-w-5xl px-6 py-12">
        <div className="stagger-children grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { icon: Clock, value: "500ms", label: "Join Latency" },
            { icon: Zap, value: "<30ms", label: "Audio / Video" },
            { icon: Radio, value: "Real-time", label: "AI Analysis" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="flex items-center gap-4 rounded-xl border border-[#2a2a2a] bg-[#181818] px-6 py-5 transition-colors hover:border-[#3a3a3a] hover:bg-[#1e1e1e]"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#2a2a2a] bg-[#1e1e1e]">
                <stat.icon className="h-5 w-5 text-zinc-400" />
              </div>
              <div>
                <p className="text-2xl font-bold tracking-tight text-white">{stat.value}</p>
                <p className="text-sm text-zinc-500">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ──────────────── Features Grid ──────────────── */}
      <section id="features" className="relative mx-auto max-w-6xl px-6 py-24">
        <div className="mb-16 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Everything you need to{" "}
            <span className="text-zinc-300">ace the interview</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-zinc-500">
            Six integrated capabilities working together to deliver the most realistic interview practice experience.
          </p>
        </div>

        <div className="stagger-children grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group rounded-xl border border-[#2a2a2a] bg-[#181818] p-6 transition-colors hover:border-[#3a3a3a] hover:bg-[#1e1e1e]"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-[#2a2a2a] bg-[#1e1e1e]">
                <Image
                  src={feature.icon}
                  alt={feature.title}
                  width={32}
                  height={32}
                  className="opacity-70 transition-opacity group-hover:opacity-90"
                />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-zinc-100">{feature.title}</h3>
              <p className="text-sm leading-relaxed text-zinc-500">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ──────────────── How It Works ──────────────── */}
      <section id="how-it-works" className="relative mx-auto max-w-5xl px-6 py-24">
        <div className="mb-16 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            How it{" "}
            <span className="text-zinc-300">works</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-zinc-500">
            Three simple steps from setup to detailed performance insights.
          </p>
        </div>

        <div className="relative grid grid-cols-1 gap-12 md:grid-cols-3 md:gap-8">
          {/* Connecting line (desktop only) */}
          <div className="pointer-events-none absolute top-12 right-[16.67%] left-[16.67%] hidden h-px bg-[#2a2a2a] md:block" />

          {steps.map((step) => (
            <div key={step.number} className="relative flex flex-col items-center text-center">
              {/* Numbered circle */}
              <div className="relative z-10 mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-[#2a2a2a] bg-[#181818]">
                <span className="text-2xl font-bold text-zinc-300">{step.number}</span>
              </div>
              <h3 className="mb-2 text-xl font-semibold text-zinc-100">{step.title}</h3>
              <p className="max-w-xs text-sm leading-relaxed text-zinc-500">{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ──────────────── Tech Stack ──────────────── */}
      <section id="tech-stack" className="mx-auto max-w-4xl px-6 py-24">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Powered by{" "}
            <span className="text-zinc-300">modern infrastructure</span>
          </h2>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          {techStack.map((tech) => (
            <span
              key={tech}
              className="rounded-full border border-[#2a2a2a] bg-[#181818] px-5 py-2.5 text-sm font-medium text-zinc-400 transition-colors hover:border-[#3a3a3a] hover:bg-[#1e1e1e] hover:text-zinc-300"
            >
              {tech}
            </span>
          ))}
        </div>
      </section>

      {/* ──────────────── CTA Section ──────────────── */}
      <section className="relative px-6 py-24">
        <div className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-[#2a2a2a] bg-[#181818] p-12 text-center md:p-16">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Ready to transform your interviews?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-zinc-500">
            Start practicing with an AI interviewer that adapts to you and helps you improve where it matters most.
          </p>
          <Link
            href="/sign-in"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-sm font-semibold text-zinc-900 transition-colors hover:bg-zinc-200"
          >
            Get Started Now
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* ──────────────── Footer ──────────────── */}
      <footer className="border-t border-[#2a2a2a] px-6 py-12">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 text-center">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-0.5 text-xl font-bold tracking-tight">
            <span className="text-white">Inter</span>
            <span className="text-zinc-400">Vue</span>
          </Link>

          <p className="max-w-md text-sm leading-relaxed text-zinc-600">
            Built with Vision Agents SDK for the Vision Possible: Agent Protocol hackathon.
          </p>

          <div className="flex items-center gap-6">
            <a href="#features" className="text-sm text-zinc-600 transition-colors hover:text-zinc-300">
              Features
            </a>
            <a href="#how-it-works" className="text-sm text-zinc-600 transition-colors hover:text-zinc-300">
              How it Works
            </a>
            <a href="#tech-stack" className="text-sm text-zinc-600 transition-colors hover:text-zinc-300">
              Tech Stack
            </a>
            <Link href="/sign-in" className="text-sm text-zinc-600 transition-colors hover:text-zinc-300">
              Sign In
            </Link>
          </div>

          <div className="h-px w-full max-w-xs bg-[#2a2a2a]" />

          <p className="text-xs text-zinc-600">
            &copy; {new Date().getFullYear()} CandidAI. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
