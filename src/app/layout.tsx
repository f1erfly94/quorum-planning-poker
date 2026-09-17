import type {Metadata, Viewport} from "next";
import {Inter, JetBrains_Mono} from "next/font/google";
import "./globals.css";

const inter = Inter({subsets: ["latin"], variable: "--font-inter", display: "swap"});
const mono = JetBrains_Mono({subsets: ["latin"], variable: "--font-mono-space", display: "swap"});

const description =
    "Planning poker for teams that estimate together. Votes stay hidden on the server until the host reveals them — no account, no install, one link.";

export const metadata: Metadata = {
    title: {default: "Quorum — planning poker", template: "%s — Quorum"},
    description,
    openGraph: {type: "website", title: "Quorum — planning poker", description},
};

export const viewport: Viewport = {
    themeColor: [
        {media: "(prefers-color-scheme: light)", color: "#f6f7f9"},
        {media: "(prefers-color-scheme: dark)", color: "#0b1120"},
    ],
};

export default function RootLayout({children}: {children: React.ReactNode}) {
    return (
        <html lang="en">
            <body className={`${inter.variable} ${mono.variable}`}>{children}</body>
        </html>
    );
}
