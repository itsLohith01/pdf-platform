"use client";

import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import { encryptPDF } from "@pdfsmaller/pdf-encrypt";

export default function ProtectPdfPage() {
    const [file, setFile] = useState<File | null>(null);
    const [pageCount, setPageCount] = useState<number | null>(null);
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [protecting, setProtecting] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    const handleFileChange = async (
        event: React.ChangeEvent<HTMLInputElement>
    ) => {
        const selectedFile = event.target.files?.[0];

        if (!selectedFile) return;

        setError("");
        setSuccess(false);
        setFile(null);
        setPageCount(null);
        setPassword("");
        setConfirmPassword("");

        if (selectedFile.type !== "application/pdf") {
            setError("Please select a valid PDF file.");
            return;
        }

        try {
            const bytes = await selectedFile.arrayBuffer();
            const pdf = await PDFDocument.load(bytes);

            setFile(selectedFile);
            setPageCount(pdf.getPageCount());
        } catch {
            setError("Unable to read this PDF. Please choose a valid PDF file.");
        }
    };

    const removeFile = () => {
        setFile(null);
        setPageCount(null);
        setPassword("");
        setConfirmPassword("");
        setError("");
        setSuccess(false);
    };

    const handleProtectPdf = async () => {
        setError("");
        setSuccess(false);

        if (!file) {
            setError("Please upload a PDF first.");
            return;
        }

        if (!password) {
            setError("Please enter a password.");
            return;
        }

        if (password.length < 4) {
            setError("Password must be at least 4 characters.");
            return;
        }

        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        try {
            setProtecting(true);

            const pdfBytes = new Uint8Array(
                await file.arrayBuffer()
            );

            const protectedPdf = await encryptPDF(
                pdfBytes,
                password,
                {
                    ownerPassword: password,
                    algorithm: "AES-256",

                    allowPrinting: true,
                    allowModifying: false,
                    allowCopying: false,
                    allowAnnotating: false,
                    allowFillingForms: true,
                    allowExtraction: false,
                    allowAssembly: false,
                    allowHighQualityPrint: true,
                }
            );

            const blob = new Blob([protectedPdf], {
                type: "application/pdf",
            });

            const url = URL.createObjectURL(blob);

            const link = document.createElement("a");
            link.href = url;
            link.download = `${file.name.replace(/\.pdf$/i, "")}_protected.pdf`;

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            URL.revokeObjectURL(url);

            setSuccess(true);
        } catch (err) {
            console.error(err);
            setError(
                "Unable to protect this PDF. Please try another PDF."
            );
        } finally {
            setProtecting(false);
        }
    };

    return (
        <main className="min-h-screen bg-gray-50 px-4 py-10">
            <div className="mx-auto max-w-4xl">
                {/* Header */}
                <div className="mb-8 text-center">
                    <h1 className="text-3xl font-bold text-gray-900">
                        Protect PDF
                    </h1>

                    <p className="mt-2 text-gray-600">
                        Add a password to protect your PDF
                    </p>
                </div>

                {/* Upload */}
                {!file && (
                    <div className="rounded-2xl border-2 border-dashed border-gray-300 bg-white p-10 text-center shadow-sm">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                            <svg
                                className="h-8 w-8 text-gray-500"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 16V4m0 0l-4 4m4-4l4 4M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2"
                                />
                            </svg>
                        </div>

                        <h2 className="text-lg font-semibold text-gray-800">
                            Upload your PDF
                        </h2>

                        <p className="mt-2 text-sm text-gray-500">
                            Select a PDF file to protect
                        </p>

                        <label
                            htmlFor="protect-pdf-upload"
                            className="mt-6 inline-block cursor-pointer rounded-lg bg-black px-6 py-3 text-sm font-medium text-white transition hover:bg-gray-800"
                        >
                            Choose PDF
                        </label>

                        <input
                            id="protect-pdf-upload"
                            type="file"
                            accept="application/pdf"
                            onChange={handleFileChange}
                            className="hidden"
                        />
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {error}
                    </div>
                )}

                {/* Uploaded PDF */}
                {file && (
                    <div className="rounded-2xl bg-white p-6 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div className="flex min-w-0 items-center gap-4">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-red-50">
                                    <span className="text-sm font-bold text-red-600">
                                        PDF
                                    </span>
                                </div>

                                <div className="min-w-0">
                                    <p className="truncate font-medium text-gray-900">
                                        {file.name}
                                    </p>

                                    <p className="mt-1 text-sm text-gray-500">
                                        {(file.size / 1024 / 1024).toFixed(2)} MB
                                        {pageCount !== null &&
                                            ` • ${pageCount} ${pageCount === 1
                                                ? "page"
                                                : "pages"
                                            }`}
                                    </p>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={removeFile}
                                className="ml-4 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-500 transition hover:bg-red-50 hover:text-red-600"
                                aria-label="Remove PDF"
                            >
                                ×
                            </button>
                        </div>

                        {/* Password Section */}
                        <div className="mt-8 border-t pt-8">
                            <h2 className="text-lg font-semibold text-gray-900">
                                Set Password
                            </h2>

                            <p className="mt-1 text-sm text-gray-500">
                                This password will be required to open the
                                protected PDF.
                            </p>

                            <div className="mt-5 space-y-4">
                                <div>
                                    <label
                                        htmlFor="protect-password"
                                        className="mb-2 block text-sm font-medium text-gray-700"
                                    >
                                        Password
                                    </label>

                                    <input
                                        id="protect-password"
                                        type="password"
                                        value={password}
                                        onChange={(e) =>
                                            setPassword(e.target.value)
                                        }
                                        placeholder="Enter password"
                                        className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-black focus:ring-1 focus:ring-black"
                                    />
                                </div>

                                <div>
                                    <label
                                        htmlFor="protect-confirm-password"
                                        className="mb-2 block text-sm font-medium text-gray-700"
                                    >
                                        Confirm Password
                                    </label>

                                    <input
                                        id="protect-confirm-password"
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) =>
                                            setConfirmPassword(e.target.value)
                                        }
                                        placeholder="Confirm password"
                                        className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-black focus:ring-1 focus:ring-black"
                                    />
                                </div>
                            </div>

                            {/* Security Info */}
                            <div className="mt-6 rounded-lg bg-gray-50 p-4">
                                <div className="flex gap-3">
                                    <span className="text-lg">🔒</span>

                                    <div>
                                        <p className="text-sm font-medium text-gray-800">
                                            AES-256 encryption
                                        </p>

                                        <p className="mt-1 text-xs leading-5 text-gray-500">
                                            Your PDF is protected directly in
                                            your browser. The original file is
                                            not uploaded to our server.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Protect Button */}
                            <button
                                type="button"
                                onClick={handleProtectPdf}
                                disabled={protecting}
                                className="mt-6 w-full rounded-lg bg-black px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {protecting
                                    ? "Protecting PDF..."
                                    : "Protect PDF"}
                            </button>

                            {success && (
                                <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-center text-sm text-green-700">
                                    PDF protected successfully. Your download
                                    should start automatically.
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}