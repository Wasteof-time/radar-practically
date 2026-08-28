import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const bricolage = localFont({
  src: "./fonts/BricolageGrotesque-latin-wght.woff2",
  variable: "--font-bricolage",
  weight: "200 800",
  display: "swap",
});

const jetbrains = localFont({
  src: "./fonts/JetBrainsMono-latin-wght.woff2",
  variable: "--font-jetbrains",
  weight: "100 800",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Sonar Playground — Robotics Club VITC",
  description:
    "Live ultrasonic sonar by Robotics Club VITC: connect an Arduino, stream angle and distance, watch the sweep.",
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
