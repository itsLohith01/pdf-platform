"use client";

import Link from "next/link";
import { Menu, ChevronDown } from "lucide-react";
import { useState } from "react";

export default function Navbar() {
    const [mobileOpen, setMobileOpen] = useState(false);

    return (
        <header className="sticky top-0 z-50 w-full border-b border-neutral-200 bg-white/95 backdrop-blur">
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">

                {/* Logo */}
                <Link
                    href="/"
                    className="flex items-center gap-2"
                    onClick={() => setMobileOpen(false)}
                >
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#5b5bd6] text-sm font-bold text-white">
                        P
                    </div>

                    <span className="text-xl font-bold tracking-tight text-neutral-900">
                        PDFForge
                    </span>
                </Link>

                {/* Desktop Navigation */}
                <nav className="hidden items-center gap-8 md:flex">

                    <div className="group relative">
                        <button className="flex items-center gap-1 text-sm font-medium text-neutral-700 transition hover:text-neutral-950">
                            Tools
                            <ChevronDown className="h-4 w-4" />
                        </button>

                        <div className="invisible absolute left-1/2 top-full mt-3 w-64 -translate-x-1/2 rounded-2xl border border-neutral-200 bg-white p-2 opacity-0 shadow-xl transition-all group-hover:visible group-hover:opacity-100">
                            <Link
                                href="/merge-pdf"
                                className="block rounded-xl px-4 py-3 text-sm hover:bg-neutral-100"
                            >
                                <span className="font-medium">Merge PDF</span>
                                <span className="mt-1 block text-xs text-neutral-500">
                                    Combine multiple PDF files
                                </span>
                            </Link>

                            <Link
                                href="/split-pdf"
                                className="block rounded-xl px-4 py-3 text-sm hover:bg-neutral-100"
                            >
                                <span className="font-medium">Split PDF</span>
                                <span className="mt-1 block text-xs text-neutral-500">
                                    Separate PDF pages
                                </span>
                            </Link>

                            <Link
                                href="/compress-pdf"
                                className="block rounded-xl px-4 py-3 text-sm hover:bg-neutral-100"
                            >
                                <span className="font-medium">Compress PDF</span>
                                <span className="mt-1 block text-xs text-neutral-500">
                                    Reduce PDF file size
                                </span>
                            </Link>
                        </div>
                    </div>

                    <Link
                        href="#features"
                        className="text-sm font-medium text-neutral-700 transition hover:text-neutral-950"
                    >
                        Features
                    </Link>

                    <Link
                        href="#pricing"
                        className="text-sm font-medium text-neutral-700 transition hover:text-neutral-950"
                    >
                        Pricing
                    </Link>
                </nav>

                {/* Desktop Actions */}
                <div className="hidden items-center gap-3 md:flex">
                    <button className="rounded-xl px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100">
                        Login
                    </button>

                    <button className="rounded-xl bg-[#5b5bd6] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#4f46c7]">
                        Get Started
                    </button>
                </div>

                {/* Mobile Menu Button */}
                <button
                    onClick={() => setMobileOpen(!mobileOpen)}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-200 md:hidden"
                    aria-label="Toggle menu"
                >
                    <Menu className="h-5 w-5" />
                </button>
            </div>

            {/* Mobile Navigation */}
            {mobileOpen && (
                <div className="border-t border-neutral-200 bg-white md:hidden">
                    <nav className="mx-auto max-w-7xl space-y-1 px-4 py-4 sm:px-6">

                        <Link
                            href="/merge-pdf"
                            onClick={() => setMobileOpen(false)}
                            className="block rounded-xl px-4 py-3 text-sm font-medium hover:bg-neutral-100"
                        >
                            Merge PDF
                        </Link>

                        <Link
                            href="/split-pdf"
                            onClick={() => setMobileOpen(false)}
                            className="block rounded-xl px-4 py-3 text-sm font-medium hover:bg-neutral-100"
                        >
                            Split PDF
                        </Link>

                        <Link
                            href="/compress-pdf"
                            onClick={() => setMobileOpen(false)}
                            className="block rounded-xl px-4 py-3 text-sm font-medium hover:bg-neutral-100"
                        >
                            Compress PDF
                        </Link>

                        <Link
                            href="#features"
                            onClick={() => setMobileOpen(false)}
                            className="block rounded-xl px-4 py-3 text-sm font-medium hover:bg-neutral-100"
                        >
                            Features
                        </Link>

                        <Link
                            href="#pricing"
                            onClick={() => setMobileOpen(false)}
                            className="block rounded-xl px-4 py-3 text-sm font-medium hover:bg-neutral-100"
                        >
                            Pricing
                        </Link>

                        <div className="border-t border-neutral-200 pt-3">
                            <button className="w-full rounded-xl px-4 py-3 text-left text-sm font-medium hover:bg-neutral-100">
                                Login
                            </button>

                            <button className="mt-2 w-full rounded-xl bg-[#5b5bd6] px-4 py-3 text-sm font-medium text-white">
                                Get Started
                            </button>
                        </div>
                    </nav>
                </div>
            )}
        </header>
    );
}