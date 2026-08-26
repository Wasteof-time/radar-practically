import type { Metadata } from "next";
import { Bricolage_Grotesque, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  axes: ["opsz"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Radar Playground — Robotics Club VITC",
  description:
    "Live ultrasonic radar by Robotics Club VITC: connect an Arduino, stream angle and distance, watch the sweep.",
  icons: {
    icon: [{ url: "/rclogo.webp", type: "image/webp" }],
    apple: [{ url: "/rclogo.webp", type: "image/webp" }],
    shortcut: "/rclogo.webp",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${bricolage.variable} ${jetbrains.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-dvh bg-background font-sans text-foreground lg:h-full lg:overflow-hidden">
        {children}
      </body>
    </html>
  );
}
