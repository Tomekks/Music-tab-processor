import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { ThemeProvider } from "./_components/ThemeProvider";
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
  title: "Guitar Practice Tabs",
  description: "Turn songs into playable, beginner-friendly guitar practice tabs.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Script
          defer
          src="https://cloud.umami.is/script.js"
          data-website-id="044e146c-abf1-4b1c-9c66-0f5e677ea717"
        />
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
