import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#1e3a8a",
};

export const metadata: Metadata = {
  title: "DepEd Attendance Monitoring System",
  description: "Geofenced Online Attendance Monitoring System for School Heads",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "DepEd Attendance",
  },
  icons: {
    // Browser URL tab icons (Favicon)
    icon: [
      { url: "/DOB_LOGO.png" },
      { url: "/DOB_LOGO.png", type: "image/png" },
    ],
    shortcut: "/DOB_LOGO.png",
    // Mobile home screen / Apple bookmark icon
    apple: "/SH.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}