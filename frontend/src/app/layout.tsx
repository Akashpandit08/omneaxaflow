import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: { template: "%s — AiVideo", default: "AiVideo — AI Video Generation" },
  description: "Create professional AI-powered presenter videos in minutes. No camera needed.",
  keywords: ["AI video", "text to video", "avatar video", "video generation"],
};

export const viewport: Viewport = {
  themeColor: "#0a0f1e",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
