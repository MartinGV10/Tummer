import type { Metadata } from "next";
import { Theme } from '@radix-ui/themes'
import "./globals.css";
import "@radix-ui/themes/styles.css";
import { ProfileProvider } from "@/src/context/ProfileContext";
import { generalSans } from './fonts'
import { FoodProvider } from "@/src/context/LoggedFoodContext";
import { MealProvider } from "@/src/context/TrackedMealsContext";
import { HealthProvider } from "@/src/context/HealthContext";

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
      <head>
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2129630041401316"
          crossOrigin="anonymous"
        />
      </head>
      <body className={`${generalSans.className} antialiased`}>
        <Theme accentColor="grass" radius="large" className={generalSans.className}>
          <ProfileProvider>
            <FoodProvider>
              <MealProvider>
                <HealthProvider>
                  <main>{children}</main>
                </HealthProvider>
              </MealProvider>
            </FoodProvider>
          </ProfileProvider>
        </Theme>
      </body>
    </html>
  );
}