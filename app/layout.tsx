import type { Metadata } from "next";
import { Geist, Noto_Sans_Tamil } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const notoSansTamil = Noto_Sans_Tamil({
  variable: "--font-tamil",
  subsets: ["tamil"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "English Practice",
  description:
    "Read the Tamil, say the English, then reveal to check. Learn English from Tamil sentences.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${notoSansTamil.variable} dark`}
    >
      <body className="min-h-screen bg-[#0f1117] text-white antialiased">
        {children}
      </body>
    </html>
  );
}
