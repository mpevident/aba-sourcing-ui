import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ABA Intelligence — CST Academy",
  description: "ABA practice acquisition sourcing platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
