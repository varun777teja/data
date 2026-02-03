import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SecureChat // End-to-End Encrypted",
  description: "Military-grade encrypted communication channel.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
