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
    const [progressStatus, setProgressStatus] = useState<string>("");
    const [compressedFile, setCompressedFile] = useState<Blob | null>(null);
    const [compressedSize, setCompressedSize] = useState<number | null>(null);

    /*
     * PDF.js worker setup
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

        if (selectedFile.type !== "application/pdf" && !selectedFile.name.toLowerCase().endsWith(".pdf")) {
            setFile(null);
            setError("Please select a valid PDF file.");
            setLoading(false);
            return;
        }

        try {
            const bytes = await selectedFile.arrayBuffer();
            const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });

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
                "Unable to read this PDF. The file may be corrupted, encrypted, or unsupported."
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

                canvas.width = Math.ceil(viewport.width);
                canvas.height = Math.ceil(viewport.height);

                await page.render({
                    canvasContext: context,
                    viewport,
                    canvas,
                }).promise;

                if (!cancelled) {
                    setThumbnail(canvas.toDataURL("image/png"));
                }

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
        setProgressStatus("");

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
     * Client-Side PDF Compression (100% Serverless & Vercel compatible)
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
        setProgressStatus("Initializing compression...");

        try {
            const bytes = await file.arrayBuffer();

            const loadingTask = pdfjsLib.getDocument({
                data: new Uint8Array(bytes),
            });

            const pdf = await loadingTask.promise;
            const totalPages = pdf.numPages;

            // Settings based on selected compression level
            const config = {
                low: { scale: 1.5, quality: 0.82 },
                recommended: { scale: 1.15, quality: 0.62 },
                high: { scale: 0.85, quality: 0.42 },
            }[compressionLevel];

            const compressedDoc = await PDFDocument.create();

            for (let pageNumber = 1; pageNumber <= totalPages; pageNumber++) {
                setProgressStatus(`Compressing page ${pageNumber} of ${totalPages}...`);

                const page = await pdf.getPage(pageNumber);
                const originalViewport = page.getViewport({ scale: 1.0 });
                const renderViewport = page.getViewport({ scale: config.scale });

                const canvas = document.createElement("canvas");
                canvas.width = Math.ceil(renderViewport.width);
                canvas.height = Math.ceil(renderViewport.height);

                const context = canvas.getContext("2d");
                if (!context) {
                    throw new Error("Unable to create canvas context.");
                }

                // Fill white background before rendering
                context.fillStyle = "#ffffff";
                context.fillRect(0, 0, canvas.width, canvas.height);

                await page.render({
                    canvasContext: context,
                    viewport: renderViewport,
                    canvas,
                }).promise;

                // Convert rendered page to JPEG at specified compression quality
                const jpegDataUrl = canvas.toDataURL("image/jpeg", config.quality);
                const base64Data = jpegDataUrl.split(",")[1];
                const binaryString = atob(base64Data);
                const imgBytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    imgBytes[i] = binaryString.charCodeAt(i);
                }

                // Embed JPEG image into new PDF document
                const embeddedImage = await compressedDoc.embedJpg(imgBytes);

                // Add page preserving exact original dimensions
                const newPage = compressedDoc.addPage([
                    originalViewport.width,
                    originalViewport.height,
                ]);

                newPage.drawImage(embeddedImage, {
                    x: 0,
                    y: 0,
                    width: originalViewport.width,
                    height: originalViewport.height,
                });

                // Clean up canvas memory
                canvas.width = 1;
                canvas.height = 1;
                page.cleanup();
            }

            setProgressStatus("Saving compressed PDF...");
            const compressedBytes = await compressedDoc.save({
                useObjectStreams: true,
                addDefaultPage: false,
            });

            await loadingTask.destroy();

            const compressedBlob = new Blob([compressedBytes as unknown as BlobPart], {
                type: "application/pdf",
            });

            setCompressedFile(compressedBlob);
            setCompressedSize(compressedBlob.size);
        } catch (err) {
            console.error("Compression error:", err);

            setError(
                err instanceof Error
                    ? err.message
                    : "Unable to compress this PDF. Please try another file."
            );
        } finally {
            setCompressing(false);
            setProgressStatus("");
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

    return (
        <main className="min-h-screen bg-gray-50 px-6 py-12">
            <div className="mx-auto max-w-5xl">

                {/* Header */}
                <div>
                    <h1 className="text-4xl font-bold text-gray-900">
                        Compress PDF
                    </h1>

                    <p className="mt-3 text-lg text-gray-600">
                        Reduce your PDF file size while keeping the document clear and usable.
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
                        className="inline-block cursor-pointer rounded-lg bg-[#5b5bd6] px-6 py-3 font-medium text-white transition hover:bg-[#4f46c7]"
                    >
                        Choose PDF
                    </label>

                    <p className="mt-4 text-sm text-gray-500">
                        Select one PDF file from your device
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
                                Choose how strongly the PDF should be compressed.
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
                                        ? "border-[#5b5bd6] bg-indigo-50 ring-2 ring-indigo-200"
                                        : "border-gray-200 bg-white hover:border-gray-400"
                                        }`}
                                >
                                    <p className="font-semibold text-gray-900">
                                        Low Compression
                                    </p>

                                    <p className="mt-1 text-sm text-gray-500">
                                        High image quality, moderate file reduction.
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
                                        ? "border-[#5b5bd6] bg-indigo-50 ring-2 ring-indigo-200"
                                        : "border-gray-200 bg-white hover:border-gray-400"
                                        }`}
                                >
                                    <p className="font-semibold text-gray-900">
                                        Recommended
                                    </p>

                                    <p className="mt-1 text-sm text-gray-500">
                                        Balanced quality and optimal file size.
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
                                        ? "border-[#5b5bd6] bg-indigo-50 ring-2 ring-indigo-200"
                                        : "border-gray-200 bg-white hover:border-gray-400"
                                        }`}
                                >
                                    <p className="font-semibold text-gray-900">
                                        High Compression
                                    </p>

                                    <p className="mt-1 text-sm text-gray-500">
                                        Maximum file size reduction.
                                    </p>
                                </button>

                            </div>
                        </div>

                        {/* Compress Button */}
                        <button
                            type="button"
                            onClick={handleCompress}
                            disabled={compressing}
                            className="mt-8 w-full rounded-xl bg-[#5b5bd6] px-6 py-4 font-semibold text-white transition hover:bg-[#4f46c7] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {compressing
                                ? progressStatus || "Compressing PDF..."
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
                                            Reduction
                                        </p>

                                        <p className="mt-1 font-semibold text-green-700">
                                            {compressionPercentage > 0 ? `${compressionPercentage}% Saved` : "Optimized"}
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