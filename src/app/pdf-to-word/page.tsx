"use client";

import { useEffect, useState } from "react";
import { PDFDocument } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import { Document, Packer, Paragraph, TextRun, ImageRun } from "docx";

type PdfInfo = {
    pageCount: number;
    fileSize: number;
};

interface ExtractedTextItem {
    str: string;
    transform: number[];
}

function isTextItem(item: unknown): item is ExtractedTextItem {
    return (
        typeof item === "object" &&
        item !== null &&
        "str" in item &&
        typeof (item as Record<string, unknown>).str === "string" &&
        "transform" in item &&
        Array.isArray((item as Record<string, unknown>).transform)
    );
}

export default function PdfToWordPage() {
    const [file, setFile] = useState<File | null>(null);
    const [pdfInfo, setPdfInfo] = useState<PdfInfo | null>(null);
    const [thumbnail, setThumbnail] = useState<string | null>(null);

    const [loading, setLoading] = useState(false);
    const [thumbnailLoading, setThumbnailLoading] = useState(false);

    const [converting, setConverting] = useState(false);
    const [progressStatus, setProgressStatus] = useState<string>("");
    const [convertedFile, setConvertedFile] = useState<Blob | null>(null);

    const [error, setError] = useState("");

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

        setFile(null);
        setPdfInfo(null);
        setThumbnail(null);
        setConvertedFile(null);

        if (selectedFile.type !== "application/pdf" && !selectedFile.name.toLowerCase().endsWith(".pdf")) {
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

            setError(
                "Unable to read this PDF. The file may be corrupted, password-protected, or unsupported."
            );
        } finally {
            setLoading(false);
        }
    };

    /*
     * Generate first-page thumbnail
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
        setConvertedFile(null);
        setError("");
        setProgressStatus("");

        const input = document.getElementById(
            "pdf-to-word-upload"
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
     * Convert PDF to Word (100% Client-side & Vercel compatible)
     */
    const handleConvert = async () => {
        if (!file) {
            setError("Please select a PDF first.");
            return;
        }

        setError("");
        setConverting(true);
        setConvertedFile(null);
        setProgressStatus("Reading PDF document...");

        try {
            const bytes = await file.arrayBuffer();

            const loadingTask = pdfjsLib.getDocument({
                data: new Uint8Array(bytes),
            });

            const pdf = await loadingTask.promise;
            const totalPages = pdf.numPages;
            const docParagraphs: Paragraph[] = [];

            for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
                setProgressStatus(`Processing page ${pageNum} of ${totalPages}...`);

                const page = await pdf.getPage(pageNum);
                const textContent = await page.getTextContent();

                const textItems: ExtractedTextItem[] = (
                    textContent.items as unknown[]
                ).filter(isTextItem);

                const hasExtractableText = textItems.some(
                    (item) => item.str.trim().length > 0
                );

                if (hasExtractableText) {
                    // Sort items top-to-bottom, left-to-right
                    // In PDF coords, higher Y is towards the top of the page
                    textItems.sort((a, b) => {
                        const yDiff = Math.abs(a.transform[5] - b.transform[5]);
                        if (yDiff < 4) {
                            return a.transform[4] - b.transform[4];
                        }
                        return b.transform[5] - a.transform[5];
                    });

                    // Group into logical lines
                    const lines: ExtractedTextItem[][] = [];
                    let currentLine: ExtractedTextItem[] = [];
                    let lastY: number | null = null;

                    for (const item of textItems) {
                        if (!item.str) continue;
                        const y = item.transform[5];
                        if (lastY === null || Math.abs(lastY - y) < 5) {
                            currentLine.push(item);
                        } else {
                            if (currentLine.length > 0) lines.push(currentLine);
                            currentLine = [item];
                        }
                        lastY = y;
                    }
                    if (currentLine.length > 0) lines.push(currentLine);

                    // Add paragraphs for this page
                    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
                        const line = lines[lineIndex];
                        const lineText = line.map((it) => it.str).join(" ").trim();
                        if (!lineText) continue;

                        const isFirstOnPage = lineIndex === 0 && pageNum > 1;

                        docParagraphs.push(
                            new Paragraph({
                                children: [
                                    new TextRun({
                                        text: lineText,
                                        size: 24, // 12pt
                                        font: "Calibri",
                                    }),
                                ],
                                pageBreakBefore: isFirstOnPage,
                                spacing: { after: 120, line: 276 },
                            })
                        );
                    }
                } else {
                    // Scanned / Image-based PDF page: render and embed page image
                    const viewport = page.getViewport({ scale: 1.5 });
                    const canvas = document.createElement("canvas");
                    canvas.width = Math.ceil(viewport.width);
                    canvas.height = Math.ceil(viewport.height);
                    const context = canvas.getContext("2d");

                    if (context) {
                        context.fillStyle = "#ffffff";
                        context.fillRect(0, 0, canvas.width, canvas.height);

                        await page.render({
                            canvasContext: context,
                            viewport,
                            canvas,
                        }).promise;

                        const dataUrl = canvas.toDataURL("image/png");
                        const base64Data = dataUrl.split(",")[1];
                        const binaryStr = atob(base64Data);
                        const imgBytes = new Uint8Array(binaryStr.length);
                        for (let i = 0; i < binaryStr.length; i++) {
                            imgBytes[i] = binaryStr.charCodeAt(i);
                        }

                        const maxWidth = 550;
                        const ratio = viewport.height / viewport.width;
                        const targetHeight = Math.round(maxWidth * ratio);

                        docParagraphs.push(
                            new Paragraph({
                                children: [
                                    new ImageRun({
                                        data: imgBytes,
                                        transformation: {
                                            width: maxWidth,
                                            height: targetHeight,
                                        },
                                        type: "png",
                                    }),
                                ],
                                pageBreakBefore: pageNum > 1,
                            })
                        );

                        canvas.width = 1;
                        canvas.height = 1;
                    }
                }

                page.cleanup();
            }

            if (docParagraphs.length === 0) {
                docParagraphs.push(
                    new Paragraph({
                        children: [new TextRun("Empty PDF document.")],
                    })
                );
            }

            setProgressStatus("Generating Word (.docx) document...");

            const doc = new Document({
                sections: [
                    {
                        properties: {},
                        children: docParagraphs,
                    },
                ],
            });

            const docxBlob = await Packer.toBlob(doc);
            await loadingTask.destroy();

            setConvertedFile(docxBlob);
        } catch (err) {
            console.error("Conversion error:", err);

            setError(
                err instanceof Error
                    ? err.message
                    : "Unable to convert this PDF to Word."
            );
        } finally {
            setConverting(false);
            setProgressStatus("");
        }
    };

    return (
        <main className="min-h-screen bg-gray-50 px-6 py-12">
            <div className="mx-auto max-w-5xl">

                {/* Header */}
                <div>
                    <h1 className="text-4xl font-bold text-gray-900">
                        PDF to Word
                    </h1>

                    <p className="mt-3 text-lg text-gray-600">
                        Convert your PDF document into an editable Word (.docx) file.
                    </p>
                </div>

                {/* Upload Area */}
                <div className="mt-8 rounded-2xl border-2 border-dashed border-gray-300 bg-white p-10 text-center">
                    <input
                        id="pdf-to-word-upload"
                        type="file"
                        accept="application/pdf"
                        onChange={handleFileChange}
                        className="hidden"
                    />

                    <label
                        htmlFor="pdf-to-word-upload"
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

                        {/* File row */}
                        <div className="mt-6 flex items-center gap-5 rounded-xl border border-gray-200 p-4">

                            {/* Thumbnail */}
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

                        {/* Convert button */}
                        <button
                            type="button"
                            onClick={handleConvert}
                            disabled={converting}
                            className="mt-8 w-full rounded-xl bg-[#5b5bd6] px-6 py-4 font-semibold text-white transition hover:bg-[#4f46c7] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {converting
                                ? progressStatus || "Converting to Word..."
                                : "Convert to Word"}
                        </button>

                        {/* Conversion result */}
                        {convertedFile && (
                            <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-6">
                                <h3 className="text-lg font-semibold text-gray-900">
                                    Conversion Complete
                                </h3>

                                <p className="mt-2 text-sm text-gray-600">
                                    Your editable Word (.docx) document is ready to download.
                                </p>

                                <a
                                    href={URL.createObjectURL(convertedFile)}
                                    download={`${file.name.replace(/\.pdf$/i, "")}.docx`}
                                    className="mt-6 block w-full rounded-xl bg-black px-6 py-4 text-center font-semibold text-white transition hover:bg-gray-800"
                                >
                                    Download Word Document (.docx)
                                </a>
                            </div>
                        )}

                    </div>
                )}
            </div>
        </main>
    );
}