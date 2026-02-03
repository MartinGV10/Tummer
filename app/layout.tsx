import type { Metadata } from "next";
import { Theme, ThemePanel } from '@radix-ui/themes'
import { Figtree } from "next/font/google";
import "./globals.css";
import Nav from "./Nav";
import "@radix-ui/themes/styles.css";
import Footer from "./Footer";

const figtree = Figtree({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Tummer",
  description: "Take control of your condition and see long term results. Start now!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${figtree.className} antialiased `}>
      <Theme accentColor="grass" radius="large">
        {/* <ThemePanel></ThemePanel> */}
        <main>{children}</main>
      </Theme>
      </body>
    </html>
  );
}
