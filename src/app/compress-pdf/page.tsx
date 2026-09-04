"use client";

import { useEffect, useState } from "react";
import { PDFDocument } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";


type PdfInfo = {
    pageCount: number;
    fileSize: number;
};

export default function CompressPdfPage() {
    const [file, setFile] = useState<File | null>(null);
    const [pdfInfo, setPdfInfo] = useState<PdfInfo | null>(null);
    const [thumbnail, setThumbnail] = useState<string | null>(null);

    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [thumbnailLoading, setThumbnailLoading] = useState(false);

    const [compressionLevel, setCompressionLevel] =
        useState<"low" | "recommended" | "high">("recommended");

    const [compressing, setCompressing] = useState(false);
    const [compressedFile, setCompressedFile] = useState<Blob | null>(null);
    const [compressedSize, setCompressedSize] = useState<number | null>(null);

    /*
     * PDF.js worker
     */
    pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

    /*
     * Handle PDF upload
     */
    const handleFileChange = async (
        event: React.ChangeEvent<HTMLInputElement>
    ) => {
        const selectedFile = event.target.files?.[0];

        if (!selectedFile) return;

        setError("");
        setLoading(true);
        setThumbnail(null);
        setPdfInfo(null);
        setCompressedFile(null);
        setCompressedSize(null);

        if (selectedFile.type !== "application/pdf") {
            setFile(null);
            setError("Please select a valid PDF file.");
            setLoading(false);
            return;
        }

        try {
            const bytes = await selectedFile.arrayBuffer();
            const pdf = await PDFDocument.load(bytes);

            setFile(selectedFile);

            setPdfInfo({
                pageCount: pdf.getPageCount(),
                fileSize: selectedFile.size,
            });
        } catch (err) {
            console.error(err);

            setFile(null);
            setPdfInfo(null);

            setError(
                "Unable to read this PDF. The file may be corrupted or unsupported."
            );
        } finally {
            setLoading(false);
        }
    };

    /*
     * Generate ONLY the first-page thumbnail
     */
    useEffect(() => {
        if (!file) {
            setThumbnail(null);
            return;
        }

        let cancelled = false;

        const generateThumbnail = async () => {
            setThumbnailLoading(true);

            try {
                const bytes = await file.arrayBuffer();

                const loadingTask = pdfjsLib.getDocument({
                    data: new Uint8Array(bytes),
                });

                const pdf = await loadingTask.promise;

                const page = await pdf.getPage(1);

                const viewport = page.getViewport({
                    scale: 0.35,
                });

                const canvas = document.createElement("canvas");
                const context = canvas.getContext("2d");

                if (!context) {
                    throw new Error("Unable to create canvas context.");
                }

                canvas.width = viewport.width;
                canvas.height = viewport.height;

                await page.render({
                    canvasContext: context,
                    viewport,
                    canvas,
                }).promise;

                if (!cancelled) {
                    setThumbnail(canvas.toDataURL("image/png"));
                }

                /*
                 * PDF.js cleanup
                 *
                 * We intentionally don't call pdf.destroy()
                 * because the PDF.js version being used may not
                 * expose destroy() on this object.
                 */
                await loadingTask.destroy();
            } catch (err) {
                console.error("Thumbnail error:", err);

                if (!cancelled) {
                    setThumbnail(null);
                }
            } finally {
                if (!cancelled) {
                    setThumbnailLoading(false);
                }
            }
        };

        generateThumbnail();

        return () => {
            cancelled = true;
        };
    }, [file]);

    /*
     * Remove uploaded PDF
     */
    const removeFile = () => {
        setFile(null);
        setPdfInfo(null);
        setThumbnail(null);
        setError("");
        setCompressedFile(null);
        setCompressedSize(null);

        const input = document.getElementById(
            "compress-pdf-upload"
        ) as HTMLInputElement | null;

        if (input) {
            input.value = "";
        }
    };

    /*
     * Format file size
     */
    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) {
            return `${bytes} B`;
        }

        if (bytes < 1024 * 1024) {
            return `${(bytes / 1024).toFixed(1)} KB`;
        }

        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    };

    /*
     * REAL PDF COMPRESSION
     *
     * Sends the PDF to:
     *
     * /api/compress-pdf
     *
     * The API then uses Ghostscript.
     */
    const handleCompress = async () => {
        if (!file) {
            setError("Please select a PDF first.");
            return;
        }

        setError("");
        setCompressing(true);
        setCompressedFile(null);
        setCompressedSize(null);

        try {
            const formData = new FormData();

            formData.append("file", file);
            formData.append("level", compressionLevel);

            const response = await fetch("/api/compress-pdf", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                const data = await response.json().catch(() => null);

                throw new Error(
                    data?.error || "Failed to compress PDF."
                );
            }

            const compressedBlob = await response.blob();

            setCompressedFile(compressedBlob);
            setCompressedSize(compressedBlob.size);
        } catch (err) {
            console.error("Compression error:", err);

            setError(
                err instanceof Error
                    ? err.message
                    : "Unable to compress this PDF."
            );
        } finally {
            setCompressing(false);
        }
    };

    /*
     * Calculate percentage saved
     */
    const compressionPercentage =
        file && compressedSize !== null
            ? Math.max(
                0,
                Math.round(
                    ((file.size - compressedSize) / file.size) * 100
                )
            )
            : 0;

    /*
     * Render page
     */
    return (
        <main className="min-h-screen bg-gray-50 px-6 py-12">
            <div className="mx-auto max-w-5xl">

                {/* Header */}
                <div>
                    <h1 className="text-4xl font-bold text-gray-900">
                        Compress PDF
                    </h1>

                    <p className="mt-3 text-lg text-gray-600">
                        Reduce your PDF file size while keeping the document
                        usable.
                    </p>
                </div>

                {/* Upload Area */}
                <div className="mt-8 rounded-2xl border-2 border-dashed border-gray-300 bg-white p-10 text-center">
                    <input
                        id="compress-pdf-upload"
                        type="file"
                        accept="application/pdf"
                        onChange={handleFileChange}
                        className="hidden"
                    />

                    <label
                        htmlFor="compress-pdf-upload"
                        className="inline-block cursor-pointer rounded-lg bg-black px-6 py-3 font-medium text-white transition hover:bg-gray-800"
                    >
                        Choose PDF
                    </label>

                    <p className="mt-4 text-sm text-gray-500">
                        Select one PDF file
                    </p>
                </div>

                {/* Loading */}
                {loading && (
                    <div className="mt-6 rounded-xl bg-white p-5 text-center shadow-sm">
                        <p className="text-gray-600">
                            Analyzing PDF...
                        </p>
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="mt-6 rounded-xl bg-red-50 p-4 text-red-700">
                        {error}
                    </div>
                )}

                {/* Uploaded PDF */}
                {file && pdfInfo && !loading && (
                    <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm">

                        {/* Header */}
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-semibold text-gray-900">
                                    PDF Information
                                </h2>

                                <p className="mt-1 text-sm text-gray-500">
                                    Your uploaded document
                                </p>
                            </div>

                            {/* Remove button */}
                            <button
                                type="button"
                                onClick={removeFile}
                                aria-label="Remove PDF"
                                title="Remove PDF"
                                className="flex h-9 w-9 items-center justify-center rounded-full text-2xl text-gray-400 transition hover:bg-red-50 hover:text-red-600"
                            >
                                ×
                            </button>
                        </div>

                        {/* File Row */}
                        <div className="mt-6 flex items-center gap-5 rounded-xl border border-gray-200 p-4">

                            {/* First page thumbnail */}
                            <div className="flex h-28 w-20 shrink-0 items-center justify-center overflow-hidden rounded-md border border-gray-200 bg-gray-100">
                                {thumbnailLoading ? (
                                    <span className="text-xs text-gray-500">
                                        Loading...
                                    </span>
                                ) : thumbnail ? (
                                    <img
                                        src={thumbnail}
                                        alt="First page thumbnail"
                                        className="h-full w-full object-contain"
                                    />
                                ) : (
                                    <span className="text-xs font-medium text-gray-500">
                                        PDF
                                    </span>
                                )}
                            </div>

                            {/* File details */}
                            <div className="min-w-0 flex-1">
                                <p
                                    className="truncate text-lg font-semibold text-gray-900"
                                    title={file.name}
                                >
                                    {file.name}
                                </p>

                                <div className="mt-3 flex flex-wrap gap-x-8 gap-y-2 text-sm">
                                    <div>
                                        <span className="text-gray-500">
                                            Size:
                                        </span>{" "}
                                        <span className="font-medium text-gray-900">
                                            {formatFileSize(pdfInfo.fileSize)}
                                        </span>
                                    </div>

                                    <div>
                                        <span className="text-gray-500">
                                            Pages:
                                        </span>{" "}
                                        <span className="font-medium text-gray-900">
                                            {pdfInfo.pageCount}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Compression Level */}
                        <div className="mt-8 border-t pt-8">
                            <h3 className="text-lg font-semibold text-gray-900">
                                Compression Level
                            </h3>

                            <p className="mt-2 text-sm text-gray-500">
                                Choose how strongly the PDF should be
                                compressed.
                            </p>

                            <div className="mt-5 grid gap-4 sm:grid-cols-3">

                                {/* LOW */}
                                <button
                                    type="button"
                                    onClick={() =>
                                        setCompressionLevel("low")
                                    }
                                    disabled={compressing}
                                    className={`rounded-xl border p-5 text-left transition ${compressionLevel === "low"
                                        ? "border-indigo-600 bg-indigo-50 ring-2 ring-indigo-200"
                                        : "border-gray-200 bg-white hover:border-gray-400"
                                        }`}
                                >
                                    <p className="font-semibold text-gray-900">
                                        Low
                                    </p>

                                    <p className="mt-1 text-sm text-gray-500">
                                        Better quality, smaller reduction.
                                    </p>
                                </button>

                                {/* RECOMMENDED */}
                                <button
                                    type="button"
                                    onClick={() =>
                                        setCompressionLevel("recommended")
                                    }
                                    disabled={compressing}
                                    className={`rounded-xl border p-5 text-left transition ${compressionLevel === "recommended"
                                        ? "border-indigo-600 bg-indigo-50 ring-2 ring-indigo-200"
                                        : "border-gray-200 bg-white hover:border-gray-400"
                                        }`}
                                >
                                    <p className="font-semibold text-gray-900">
                                        Recommended
                                    </p>

                                    <p className="mt-1 text-sm text-gray-500">
                                        Balanced quality and file size.
                                    </p>
                                </button>

                                {/* HIGH */}
                                <button
                                    type="button"
                                    onClick={() =>
                                        setCompressionLevel("high")
                                    }
                                    disabled={compressing}
                                    className={`rounded-xl border p-5 text-left transition ${compressionLevel === "high"
                                        ? "border-indigo-600 bg-indigo-50 ring-2 ring-indigo-200"
                                        : "border-gray-200 bg-white hover:border-gray-400"
                                        }`}
                                >
                                    <p className="font-semibold text-gray-900">
                                        High
                                    </p>

                                    <p className="mt-1 text-sm text-gray-500">
                                        Maximum reduction, lower quality.
                                    </p>
                                </button>

                            </div>
                        </div>

                        {/* Compress Button */}
                        <button
                            type="button"
                            onClick={handleCompress}
                            disabled={compressing}
                            className="mt-8 w-full rounded-xl bg-indigo-600 px-6 py-4 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {compressing
                                ? "Compressing PDF..."
                                : "Compress PDF"}
                        </button>

                        {/* Compression Result */}
                        {compressedFile && compressedSize !== null && (
                            <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-6">

                                <h3 className="text-lg font-semibold text-gray-900">
                                    Compression Complete
                                </h3>

                                <div className="mt-4 grid gap-4 sm:grid-cols-3">

                                    <div>
                                        <p className="text-sm text-gray-500">
                                            Original Size
                                        </p>

                                        <p className="mt-1 font-semibold text-gray-900">
                                            {formatFileSize(file.size)}
                                        </p>
                                    </div>

                                    <div>
                                        <p className="text-sm text-gray-500">
                                            Compressed Size
                                        </p>

                                        <p className="mt-1 font-semibold text-gray-900">
                                            {formatFileSize(compressedSize)}
                                        </p>
                                    </div>

                                    <div>
                                        <p className="text-sm text-gray-500">
                                            Saved
                                        </p>

                                        <p className="mt-1 font-semibold text-green-700">
                                            {compressionPercentage}%
                                        </p>
                                    </div>

                                </div>

                                <p className="mt-4 text-sm text-gray-600">
                                    Compression level:{" "}
                                    <span className="font-medium capitalize">
                                        {compressionLevel}
                                    </span>
                                </p>

                                <a
                                    href={URL.createObjectURL(
                                        compressedFile
                                    )}
                                    download={`compressed-${file.name}`}
                                    className="mt-6 block w-full rounded-xl bg-black px-6 py-4 text-center font-semibold text-white transition hover:bg-gray-800"
                                >
                                    Download Compressed PDF
                                </a>
                            </div>
                        )}

                    </div>
                )}
            </div>
        </main>
    );
}