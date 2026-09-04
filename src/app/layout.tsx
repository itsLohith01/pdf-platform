import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/layout/navbar";
export const metadata: Metadata = {
    title: "PDFForge — Powerful PDF Tools",
    description:
        "Merge, split, compress, convert and manage PDF files with PDFForge.",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body>
                <Navbar />
                {children}
            </body>
        </html>
    );
}