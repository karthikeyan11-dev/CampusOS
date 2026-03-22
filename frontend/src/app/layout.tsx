import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeInitializer } from "@/components/layout/ThemeInitializer";
import { AuthLoader } from "@/components/layout/AuthLoader";
import { LayoutProvider } from "@/components/layout/LayoutProvider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "CampusOS — AI Powered Smart Campus Management Platform",
  description: "Centralized smart campus platform for managing academic requests, digital gate passes, and institutional intelligence.",
  keywords: "campus management, smart campus, AI, gate pass, grievance system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" style={{ colorScheme: 'dark' }} suppressHydrationWarning>
      <head>
        <ThemeInitializer />
      </head>
      <body className={`${inter.variable} font-sans antialiased text-cos-text-primary bg-cos-bg-primary`}>
        <AuthLoader />
        <LayoutProvider>
          {children}
        </LayoutProvider>
      </body>
    </html>
  );
}
