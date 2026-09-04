"use client";

import Link from "next/link";
import { Menu, ChevronDown, X } from "lucide-react";
import { useState } from "react";
import { pdfTools } from "@/data/tools";

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
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#5b5bd6] text-sm font-bold text-white shadow-sm">
                        P
                    </div>

                    <span className="text-xl font-bold tracking-tight text-neutral-900">
                        PDFForge
                    </span>
                </Link>

                {/* Desktop Navigation */}
                <nav className="hidden items-center gap-8 md:flex">

                    {/* Tools Dropdown */}
                    <div className="group relative">
                        <button className="flex items-center gap-1.5 text-sm font-medium text-neutral-700 transition hover:text-neutral-950">
                            Tools
                            <ChevronDown className="h-4 w-4 text-neutral-500 transition-transform group-hover:rotate-180" />
                        </button>

                        <div className="invisible absolute left-1/2 top-full mt-3 w-80 -translate-x-1/2 rounded-2xl border border-neutral-200 bg-white p-2 opacity-0 shadow-2xl transition-all duration-200 group-hover:visible group-hover:opacity-100">
                            <div className="space-y-1">
                                {pdfTools.map((tool) => {
                                    const Icon = tool.icon;
                                    return (
                                        <Link
                                            key={tool.id}
                                            href={tool.href}
                                            className="flex items-start gap-3 rounded-xl px-3 py-2.5 text-sm transition hover:bg-neutral-100"
                                        >
                                            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-700">
                                                <Icon className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <span className="font-medium text-neutral-900 block">{tool.name}</span>
                                                <span className="block text-xs text-neutral-500">
                                                    {tool.description}
                                                </span>
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    <Link
                        href="/#features"
                        className="text-sm font-medium text-neutral-700 transition hover:text-neutral-950"
                    >
                        Features
                    </Link>

                    <Link
                        href="/#how-it-works"
                        className="text-sm font-medium text-neutral-700 transition hover:text-neutral-950"
                    >
                        How it works
                    </Link>
                </nav>

                {/* Desktop Actions */}
                <div className="hidden items-center gap-3 md:flex">
                    <Link
                        href="/#tools"
                        className="rounded-xl bg-[#5b5bd6] px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-[#4f46c7]"
                    >
                        Get Started
                    </Link>
                </div>

                {/* Mobile Menu Button */}
                <button
                    onClick={() => setMobileOpen(!mobileOpen)}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-200 md:hidden"
                    aria-label="Toggle menu"
                >
                    {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>
            </div>

            {/* Mobile Navigation */}
            {mobileOpen && (
                <div className="border-t border-neutral-200 bg-white md:hidden shadow-lg">
                    <nav className="mx-auto max-w-7xl space-y-2 px-4 py-4 sm:px-6">
                        <div className="space-y-1">
                            <p className="px-3 text-xs font-semibold uppercase tracking-wider text-neutral-400">
                                All PDF Tools
                            </p>
                            {pdfTools.map((tool) => {
                                const Icon = tool.icon;
                                return (
                                    <Link
                                        key={tool.id}
                                        href={tool.href}
                                        onClick={() => setMobileOpen(false)}
                                        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-neutral-800 hover:bg-neutral-100"
                                    >
                                        <Icon className="h-4 w-4 text-neutral-600" />
                                        <span>{tool.name}</span>
                                    </Link>
                                );
                            })}
                        </div>

                        <div className="border-t border-neutral-200 pt-3 space-y-1">
                            <Link
                                href="/#features"
                                onClick={() => setMobileOpen(false)}
                                className="block rounded-xl px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
                            >
                                Features
                            </Link>

                            <Link
                                href="/#how-it-works"
                                onClick={() => setMobileOpen(false)}
                                className="block rounded-xl px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
                            >
                                How it works
                            </Link>
                        </div>

                        <div className="border-t border-neutral-200 pt-3">
                            <Link
                                href="/#tools"
                                onClick={() => setMobileOpen(false)}
                                className="block w-full rounded-xl bg-[#5b5bd6] px-4 py-3 text-center text-sm font-medium text-white"
                            >
                                Get Started
                            </Link>
                        </div>
                    </nav>
                </div>
            )}
        </header>
    );
}