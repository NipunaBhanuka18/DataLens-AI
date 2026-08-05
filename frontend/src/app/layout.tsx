"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React, { useState } from "react";
import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  return (
    <html lang="en" className="dark">
      <head>
        <title>DataLens AI - Autonomous AI Data Science Copilot</title>
        <meta name="description" content="Autonomous AI Data Science Copilot powered by FastAPI, Polars, and LangGraph" />
      </head>
      <body className="bg-[#0B0F19] text-white min-h-screen font-sans antialiased relative overflow-x-hidden selection:bg-[#22C55E]/30">
        {/* Subtle Ambient Mesh Orbs */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          <div className="w-[650px] h-[650px] rounded-full bg-[#06B6D4]/5 blur-[160px] absolute -top-32 -right-32" />
          <div className="w-[750px] h-[750px] rounded-full bg-[#A855F7]/4 blur-[180px] absolute -bottom-48 -left-48" />
        </div>

        <QueryClientProvider client={queryClient}>
          <div className="relative z-10">
            {children}
          </div>
        </QueryClientProvider>
      </body>
    </html>
  );
}
