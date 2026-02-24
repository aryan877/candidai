import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import { ConvexClientProvider } from "@/components/providers/ConvexClientProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CandidAI — AI-Powered Technical Interviews",
  description:
    "CandidAI conducts realistic AI-powered technical interviews with real-time coding challenges, body language analysis, and comprehensive performance reports.",
  keywords: [
    "interview",
    "AI interviewer",
    "technical interview",
    "coding challenge",
    "mock interview",
    "hiring",
    "vision agents",
  ],
  icons: {
    icon: "/favicon.ico",
    apple: "/logo.png",
  },
  openGraph: {
    title: "CandidAI — AI-Powered Technical Interviews",
    description:
      "Practice with an AI interviewer that conducts realistic technical interviews, analyzes body language, and delivers comprehensive reports.",
    type: "website",
    images: ["/logo.png"],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} noise-overlay min-h-screen bg-background text-foreground antialiased`}
      >
        <ConvexAuthNextjsServerProvider>
          <ConvexClientProvider>{children}</ConvexClientProvider>
        </ConvexAuthNextjsServerProvider>
      </body>
    </html>
  );
}
