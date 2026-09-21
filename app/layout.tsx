import type { Metadata } from "next";
import { Poppins } from "next/font/google"; // 1. Import Poppins
import "./globals.css";

// 2. Configure the font weights you want to use
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"], // Adjust weights as needed
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: "Property Explorer & CRM",
  description: "Live aggregated property listings and follow-up pipeline",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={poppins.variable}>
      {/* 3. Apply the font family class directly to the body */}
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  );
}