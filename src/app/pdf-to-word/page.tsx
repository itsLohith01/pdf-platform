"use client";

import { useEffect, useState } from "react";
import { PDFDocument } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

type PdfInfo = {
    pageCount: number;
    fileSize: number;
};

export default function PdfToWordPage() {
    const [file, setFile] = useState<File | null>(null);
    const [pdfInfo, setPdfInfo] = useState<PdfInfo | null>(null);

    const [thumbnail, setThumbnail] = useState<string | null>(null);

    const [loading, setLoading] = useState(false);
    const [thumbnailLoading, setThumbnailLoading] = useState(false);

    const [converting, setConverting] = useState(false);
    const [convertedFile, setConvertedFile] = useState<Blob | null>(null);

    const [error, setError] = useState("");

    /*
     * PDF.js worker
     */
    pdfjsLib.GlobalWorkerOptions.workerSrc =
        "/pdf.worker.min.mjs";

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

        if (selectedFile.type !== "application/pdf") {
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

            setError(
                "Unable to read this PDF. The file may be corrupted or unsupported."
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

                const canvas =
                    document.createElement("canvas");

                const context =
                    canvas.getContext("2d");

                if (!context) {
                    throw new Error(
                        "Unable to create canvas context."
                    );
                }

                canvas.width = viewport.width;
                canvas.height = viewport.height;

                await page.render({
                    canvasContext: context,
                    viewport,
                    canvas,
                }).promise;

                if (!cancelled) {
                    setThumbnail(
                        canvas.toDataURL("image/png")
                    );
                }

                await loadingTask.destroy();
            } catch (err) {
                console.error(
                    "Thumbnail error:",
                    err
                );

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

        return `${(
            bytes /
            (1024 * 1024)
        ).toFixed(2)} MB`;
    };

    /*
     * Convert PDF to Word
     */
    const handleConvert = async () => {
        if (!file) {
            setError("Please select a PDF first.");
            return;
        }

        setError("");
        setConverting(true);
        setConvertedFile(null);

        try {
            /*
             * Read PDF in the browser.
             */
            const bytes = await file.arrayBuffer();

            const loadingTask = pdfjsLib.getDocument({
                data: new Uint8Array(bytes),
            });

            const pdf = await loadingTask.promise;

            const formData = new FormData();

            /*
             * Send original PDF.
             */
            formData.append("file", file);

            /*
             * Render every PDF page in the browser.
             */
            for (
                let pageNumber = 1;
                pageNumber <= pdf.numPages;
                pageNumber++
            ) {
                console.log(
                    `Rendering page ${pageNumber}/${pdf.numPages}`
                );

                const page =
                    await pdf.getPage(pageNumber);

                /*
                 * High enough quality for Word.
                 */
                const viewport =
                    page.getViewport({
                        scale: 1.5,
                    });

                const canvas =
                    document.createElement(
                        "canvas"
                    );

                const context =
                    canvas.getContext("2d");

                if (!context) {
                    throw new Error(
                        "Unable to create canvas context."
                    );
                }

                canvas.width = Math.ceil(
                    viewport.width
                );

                canvas.height = Math.ceil(
                    viewport.height
                );

                await page.render({
                    canvasContext: context,
                    viewport,
                    canvas,
                }).promise;

                /*
                 * Convert rendered page to PNG.
                 */
                const blob =
                    await new Promise<Blob>(
                        (resolve, reject) => {
                            canvas.toBlob(
                                (result) => {
                                    if (result) {
                                        resolve(
                                            result
                                        );
                                    } else {
                                        reject(
                                            new Error(
                                                "Failed to create page image."
                                            )
                                        );
                                    }
                                },
                                "image/png"
                            );
                        }
                    );

                /*
                 * Add rendered page to FormData.
                 */
                formData.append(
                    "pageImages",
                    blob,
                    `page-${pageNumber}.png`
                );

                /*
                 * Release browser canvas memory.
                 */
                canvas.width = 1;
                canvas.height = 1;

                page.cleanup();
            }

            /*
             * Destroy PDF.js loading task.
             */
            await loadingTask.destroy();

            /*
             * Send rendered pages to server.
             */
            const response = await fetch(
                "/api/pdf-to-word",
                {
                    method: "POST",
                    body: formData,
                }
            );

            if (!response.ok) {
                const data =
                    await response
                        .json()
                        .catch(() => null);

                throw new Error(
                    data?.error ||
                    "Failed to convert PDF to Word."
                );
            }

            const blob =
                await response.blob();

            setConvertedFile(blob);
        } catch (err) {
            console.error(
                "Conversion error:",
                err
            );

            setError(
                err instanceof Error
                    ? err.message
                    : "Unable to convert this PDF."
            );
        } finally {
            setConverting(false);
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
                        Convert your PDF document into
                        an editable Word file.
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
                {file &&
                    pdfInfo &&
                    !loading && (
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
                                                {formatFileSize(
                                                    pdfInfo.fileSize
                                                )}
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
                                className="mt-8 w-full rounded-xl bg-indigo-600 px-6 py-4 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {converting
                                    ? "Converting to Word..."
                                    : "Convert to Word"}
                            </button>

                            {/* Conversion result */}
                            {convertedFile && (
                                <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-6">

                                    <h3 className="text-lg font-semibold text-gray-900">
                                        Conversion Complete
                                    </h3>

                                    <p className="mt-2 text-sm text-gray-600">
                                        Your Word document is ready.
                                    </p>

                                    <a
                                        href={URL.createObjectURL(
                                            convertedFile
                                        )}
                                        download={`${file.name.replace(
                                            /\.pdf$/i,
                                            ""
                                        )}.docx`}
                                        className="mt-6 block w-full rounded-xl bg-black px-6 py-4 text-center font-semibold text-white transition hover:bg-gray-800"
                                    >
                                        Download Word File
                                    </a>

                                </div>
                            )}

                        </div>
                    )}
            </div>
        </main>
    );
}