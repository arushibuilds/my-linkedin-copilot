import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "My LinkedIn Copilot",
  description: "A private writing workspace that knows how you write.",
  icons: { icon: "/icon.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
