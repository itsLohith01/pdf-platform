"use client";

import { useEffect, useState } from "react";
import { PDFDocument } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

// PDF.js worker
if (typeof window !== "undefined") {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
        `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
}

type PagePreview = {
    pageNumber: number;
    imageUrl: string;
};

export default function SplitPdfPage() {
    const [file, setFile] = useState<File | null>(null);
    const [pageCount, setPageCount] = useState(0);
    const [selectedPages, setSelectedPages] = useState<number[]>([]);
    const [previews, setPreviews] = useState<PagePreview[]>([]);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [splitting, setSplitting] = useState(false);

    // Clean up generated preview URLs
    useEffect(() => {
        return () => {
            previews.forEach((preview) => {
                URL.revokeObjectURL(preview.imageUrl);
            });
        };
    }, [previews]);

    const handleFileChange = async (
        event: React.ChangeEvent<HTMLInputElement>
    ) => {
        const selectedFile = event.target.files?.[0];

        if (!selectedFile) return;

        setError("");
        setLoading(true);
        setPreviews([]);
        setSelectedPages([]);
        setPageCount(0);

        if (selectedFile.type !== "application/pdf") {
            setError("Please select a valid PDF file.");
            setLoading(false);
            return;
        }

        try {
            // Read PDF file
            const bytes = await selectedFile.arrayBuffer();

            // Read PDF using pdf-lib
            const pdf = await PDFDocument.load(bytes);
            const count = pdf.getPageCount();

            setFile(selectedFile);
            setPageCount(count);

            // Initially select all pages
            setSelectedPages(
                Array.from({ length: count }, (_, index) => index)
            );

            // Load PDF using PDF.js for previews
            const loadingTask = pdfjsLib.getDocument({
                data: bytes,
            });

            const pdfJsDocument = await loadingTask.promise;

            const generatedPreviews: PagePreview[] = [];

            for (
                let pageNumber = 1;
                pageNumber <= pdfJsDocument.numPages;
                pageNumber++
            ) {
                const page = await pdfJsDocument.getPage(pageNumber);

                const scale = 0.7;

                const viewport = page.getViewport({
                    scale,
                });

                const canvas = document.createElement("canvas");

                const context = canvas.getContext("2d");

                if (!context) {
                    throw new Error("Unable to create canvas context.");
                }

                canvas.width = viewport.width;
                canvas.height = viewport.height;

                await page.render({
                    canvas,
                    canvasContext: context,
                    viewport,
                }).promise;

                const imageUrl = canvas.toDataURL("image/jpeg", 0.85);

                generatedPreviews.push({
                    pageNumber,
                    imageUrl,
                });
            }

            setPreviews(generatedPreviews);
        } catch (err) {
            console.error(err);

            setFile(null);
            setPageCount(0);
            setSelectedPages([]);
            setPreviews([]);

            setError(
                "Unable to generate PDF page previews. The PDF may be corrupted or unsupported."
            );
        } finally {
            setLoading(false);
        }
    };

    // Toggle individual page
    const togglePage = (pageIndex: number) => {
        setSelectedPages((current) => {
            if (current.includes(pageIndex)) {
                return current.filter((index) => index !== pageIndex);
            }

            return [...current, pageIndex].sort((a, b) => a - b);
        });
    };

    // Select all pages
    const selectAll = () => {
        setSelectedPages(
            Array.from({ length: pageCount }, (_, index) => index)
        );
    };

    // Deselect all pages
    const deselectAll = () => {
        setSelectedPages([]);
    };

    // Split and download PDF
    const handleSplitPdf = async () => {
        if (!file) {
            setError("Please select a PDF file first.");
            return;
        }

        if (selectedPages.length === 0) {
            setError("Please select at least one page.");
            return;
        }

        try {
            setError("");
            setSplitting(true);

            // Read original PDF
            const bytes = await file.arrayBuffer();

            // Load source PDF
            const sourcePdf = await PDFDocument.load(bytes);

            // Create new PDF
            const outputPdf = await PDFDocument.create();

            // Copy selected pages
            const copiedPages = await outputPdf.copyPages(
                sourcePdf,
                selectedPages
            );

            // Add pages to output PDF
            copiedPages.forEach((page) => {
                outputPdf.addPage(page);
            });

            // Generate PDF bytes
            const outputBytes = await outputPdf.save();

            // Convert to Blob
            const blob = new Blob(
                [outputBytes.buffer as ArrayBuffer],
                {
                    type: "application/pdf",
                }
            );

            // Create temporary URL
            const url = URL.createObjectURL(blob);

            // Create download link
            const link = document.createElement("a");

            link.href = url;
            link.download = "PDFForge_split.pdf";

            document.body.appendChild(link);
            link.click();

            // Cleanup
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error(err);
            setError("Unable to split the PDF. Please try again.");
        } finally {
            setSplitting(false);
        }
    };

    return (
        <main className="min-h-screen bg-gray-50 px-6 py-12">
            <div className="mx-auto max-w-6xl">
                {/* Header */}
                <div>
                    <h1 className="text-4xl font-bold text-gray-900">
                        Split PDF
                    </h1>

                    <p className="mt-3 text-lg text-gray-600">
                        Upload a PDF and select the pages you want to extract.
                    </p>
                </div>

                {/* Upload Area */}
                <div className="mt-8 rounded-2xl border-2 border-dashed border-gray-300 bg-white p-10 text-center">
                    <input
                        id="pdf-upload"
                        type="file"
                        accept="application/pdf"
                        onChange={handleFileChange}
                        className="hidden"
                    />

                    <label
                        htmlFor="pdf-upload"
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
                    <div className="mt-6 rounded-xl bg-white p-6 text-center shadow-sm">
                        <p className="text-gray-600">
                            Generating PDF page previews...
                        </p>
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="mt-6 rounded-xl bg-red-50 p-4 text-red-700">
                        {error}
                    </div>
                )}

                {/* PDF Information */}
                {file && !loading && (
                    <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h2 className="text-xl font-semibold text-gray-900">
                                    {file.name}
                                </h2>

                                <p className="mt-1 text-sm text-gray-500">
                                    {pageCount}{" "}
                                    {pageCount === 1
                                        ? "page"
                                        : "pages"}{" "}
                                    • {selectedPages.length} selected
                                </p>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={selectAll}
                                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                                >
                                    Select All
                                </button>

                                <button
                                    onClick={deselectAll}
                                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                                >
                                    Deselect All
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Page Previews */}
                {previews.length > 0 && (
                    <div className="mt-8">
                        <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                            {previews.map((preview) => {
                                const pageIndex = preview.pageNumber - 1;

                                const isSelected =
                                    selectedPages.includes(pageIndex);

                                return (
                                    <button
                                        key={preview.pageNumber}
                                        type="button"
                                        onClick={() =>
                                            togglePage(pageIndex)
                                        }
                                        className={`group rounded-xl bg-white p-3 text-left shadow-sm transition ${isSelected
                                                ? "ring-2 ring-indigo-600"
                                                : "ring-1 ring-gray-200 hover:ring-gray-400"
                                            }`}
                                    >
                                        {/* Preview */}
                                        <div className="relative overflow-hidden rounded-lg bg-gray-100">
                                            <img
                                                src={preview.imageUrl}
                                                alt={`Page ${preview.pageNumber}`}
                                                className="w-full"
                                            />

                                            {/* Selection indicator */}
                                            <div
                                                className={`absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold ${isSelected
                                                        ? "bg-indigo-600 text-white"
                                                        : "bg-white text-gray-500 shadow"
                                                    }`}
                                            >
                                                {isSelected ? "✓" : ""}
                                            </div>
                                        </div>

                                        {/* Page number */}
                                        <div className="mt-3 text-center">
                                            <p
                                                className={`text-sm font-medium ${isSelected
                                                        ? "text-indigo-600"
                                                        : "text-gray-700"
                                                    }`}
                                            >
                                                Page {preview.pageNumber}
                                            </p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Split Button */}
                {file && !loading && (
                    <div className="mt-8">
                        <button
                            onClick={handleSplitPdf}
                            disabled={
                                selectedPages.length === 0 ||
                                splitting
                            }
                            className="w-full rounded-xl bg-indigo-600 px-6 py-4 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                        >
                            {splitting
                                ? "Creating PDF..."
                                : `Split PDF (${selectedPages.length} ${selectedPages.length === 1
                                    ? "page"
                                    : "pages"
                                })`}
                        </button>
                    </div>
                )}
            </div>
        </main>
    );
}