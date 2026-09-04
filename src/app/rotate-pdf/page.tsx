"use client";

import { useEffect, useState } from "react";
import { PDFDocument, degrees } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

type PagePreview = {
    pageNumber: number;
    imageUrl: string;
};

export default function RotatePdfPage() {
    const [file, setFile] = useState<File | null>(null);
    const [pageCount, setPageCount] = useState(0);

    const [previews, setPreviews] = useState<PagePreview[]>(
        []
    );

    /*
     * Stores rotation for every page.
     *
     * Example:
     *
     * {
     *   0: 90,
     *   1: 0,
     *   2: 180,
     *   3: 270
     * }
     */
    const [pageRotations, setPageRotations] =
        useState<Record<number, number>>({});

    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [rotating, setRotating] = useState(false);

    /*
     * PDF.js worker
     */
    if (typeof window !== "undefined") {
        pdfjsLib.GlobalWorkerOptions.workerSrc =
            "/pdf.worker.min.mjs";
    }

    /*
     * Cleanup preview URLs.
     */
    useEffect(() => {
        return () => {
            previews.forEach((preview) => {
                URL.revokeObjectURL(preview.imageUrl);
            });
        };
    }, [previews]);

    /*
     * Handle PDF upload.
     */
    const handleFileChange = async (
        event: React.ChangeEvent<HTMLInputElement>
    ) => {
        const selectedFile =
            event.target.files?.[0];

        if (!selectedFile) return;

        setError("");
        setLoading(true);

        setFile(null);
        setPageCount(0);
        setPreviews([]);
        setPageRotations({});

        if (
            selectedFile.type !==
            "application/pdf"
        ) {
            setError(
                "Please select a valid PDF file."
            );

            setLoading(false);
            return;
        }

        try {
            /*
             * Read PDF with pdf-lib.
             */
            const bytes =
                await selectedFile.arrayBuffer();

            const pdf =
                await PDFDocument.load(bytes);

            const count =
                pdf.getPageCount();

            setFile(selectedFile);
            setPageCount(count);

            /*
             * Initially every page has
             * 0° additional rotation.
             */
            const initialRotations: Record<
                number,
                number
            > = {};

            for (
                let i = 0;
                i < count;
                i++
            ) {
                initialRotations[i] = 0;
            }

            setPageRotations(
                initialRotations
            );

            /*
             * Load PDF using PDF.js.
             */
            const loadingTask =
                pdfjsLib.getDocument({
                    data: bytes,
                });

            const pdfJsDocument =
                await loadingTask.promise;

            const generatedPreviews: PagePreview[] =
                [];

            /*
             * Generate preview for
             * every page.
             */
            for (
                let pageNumber = 1;
                pageNumber <=
                pdfJsDocument.numPages;
                pageNumber++
            ) {
                const page =
                    await pdfJsDocument.getPage(
                        pageNumber
                    );

                const viewport =
                    page.getViewport({
                        scale: 0.7,
                        rotation: 0,
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

                canvas.width =
                    Math.ceil(
                        viewport.width
                    );

                canvas.height =
                    Math.ceil(
                        viewport.height
                    );

                await page.render({
                    canvas,
                    canvasContext:
                        context,
                    viewport,
                }).promise;

                const imageUrl =
                    canvas.toDataURL(
                        "image/jpeg",
                        0.85
                    );

                generatedPreviews.push({
                    pageNumber,
                    imageUrl,
                });
            }

            setPreviews(
                generatedPreviews
            );

            await loadingTask.destroy();
        } catch (err) {
            console.error(err);

            setFile(null);
            setPageCount(0);
            setPreviews([]);
            setPageRotations({});

            setError(
                "Unable to generate PDF page previews. The PDF may be corrupted or unsupported."
            );
        } finally {
            setLoading(false);
        }
    };

    /*
     * Rotate one individual page clockwise.
     */
    const rotatePageRight = (
        pageIndex: number
    ) => {
        setPageRotations((current) => ({
            ...current,
            [pageIndex]:
                ((current[pageIndex] || 0) +
                    90) %
                360,
        }));
    };

    /*
     * Rotate one individual page
     * counter-clockwise.
     */
    const rotatePageLeft = (
        pageIndex: number
    ) => {
        setPageRotations((current) => ({
            ...current,
            [pageIndex]:
                ((current[pageIndex] || 0) +
                    270) %
                360,
        }));
    };

    /*
     * Reset one individual page.
     */
    const resetPageRotation = (
        pageIndex: number
    ) => {
        setPageRotations((current) => ({
            ...current,
            [pageIndex]: 0,
        }));
    };

    /*
     * Reset every page.
     */
    const resetAllRotations = () => {
        const resetRotations: Record<
            number,
            number
        > = {};

        for (
            let i = 0;
            i < pageCount;
            i++
        ) {
            resetRotations[i] = 0;
        }

        setPageRotations(
            resetRotations
        );
    };

    /*
     * Rotate and download PDF.
     */
    const handleRotatePdf =
        async () => {
            if (!file) {
                setError(
                    "Please select a PDF file first."
                );
                return;
            }

            const hasRotation =
                Object.values(
                    pageRotations
                ).some(
                    (rotation) =>
                        rotation !== 0
                );

            if (!hasRotation) {
                setError(
                    "Please rotate at least one page first."
                );
                return;
            }

            setError("");
            setRotating(true);

            try {
                /*
                 * Read original PDF.
                 */
                const bytes =
                    await file.arrayBuffer();

                /*
                 * Load PDF.
                 */
                const pdf =
                    await PDFDocument.load(
                        bytes
                    );

                const pages =
                    pdf.getPages();

                /*
                 * Apply each page's
                 * individual rotation.
                 */
                pages.forEach(
                    (page, index) => {
                        const additionalRotation =
                            pageRotations[
                            index
                            ] || 0;

                        if (
                            additionalRotation ===
                            0
                        ) {
                            return;
                        }

                        /*
                         * Preserve any
                         * existing PDF rotation.
                         */
                        const existingRotation =
                            page
                                .getRotation()
                                .angle;

                        const finalRotation =
                            (
                                existingRotation +
                                additionalRotation
                            ) % 360;

                        page.setRotation(
                            degrees(
                                finalRotation
                            )
                        );
                    }
                );

                /*
                 * Save final PDF.
                 */
                const outputBytes =
                    await pdf.save();

                /*
                 * Create PDF Blob.
                 */
                const blob =
                    new Blob(
                        [
                            outputBytes.buffer as ArrayBuffer,
                        ],
                        {
                            type: "application/pdf",
                        }
                    );

                /*
                 * Download.
                 */
                const url =
                    URL.createObjectURL(
                        blob
                    );

                const link =
                    document.createElement(
                        "a"
                    );

                link.href = url;

                const baseName =
                    file.name.replace(
                        /\.pdf$/i,
                        ""
                    );

                link.download =
                    `${baseName}_rotated.pdf`;

                document.body.appendChild(
                    link
                );

                link.click();

                document.body.removeChild(
                    link
                );

                URL.revokeObjectURL(url);
            } catch (err) {
                console.error(err);

                setError(
                    "Unable to rotate the PDF. Please try again."
                );
            } finally {
                setRotating(false);
            }
        };

    /*
     * Remove uploaded PDF.
     */
    const removeFile = () => {
        setFile(null);
        setPageCount(0);
        setPreviews([]);
        setPageRotations({});
        setError("");

        const input =
            document.getElementById(
                "rotate-pdf-upload"
            ) as HTMLInputElement | null;

        if (input) {
            input.value = "";
        }
    };

    return (
        <main className="min-h-screen bg-gray-50 px-6 py-12">
            <div className="mx-auto max-w-6xl">

                {/* Header */}
                <div>
                    <h1 className="text-4xl font-bold text-gray-900">
                        Rotate PDF
                    </h1>

                    <p className="mt-3 text-lg text-gray-600">
                        Rotate individual PDF pages
                        exactly the way you want.
                    </p>
                </div>

                {/* Upload Area */}
                <div className="mt-8 rounded-2xl border-2 border-dashed border-gray-300 bg-white p-10 text-center">

                    <input
                        id="rotate-pdf-upload"
                        type="file"
                        accept="application/pdf"
                        onChange={
                            handleFileChange
                        }
                        className="hidden"
                    />

                    <label
                        htmlFor="rotate-pdf-upload"
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
                            Generating PDF page
                            previews...
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
                {file &&
                    !loading && (
                        <>
                            <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm">

                                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                                    <div>
                                        <h2 className="text-xl font-semibold text-gray-900">
                                            {file.name}
                                        </h2>

                                        <p className="mt-1 text-sm text-gray-500">
                                            {pageCount}{" "}
                                            {pageCount ===
                                                1
                                                ? "page"
                                                : "pages"}
                                        </p>
                                    </div>

                                    <div className="flex gap-3">

                                        <button
                                            type="button"
                                            onClick={
                                                resetAllRotations
                                            }
                                            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                                        >
                                            Reset All
                                        </button>

                                        <button
                                            type="button"
                                            onClick={
                                                removeFile
                                            }
                                            className="flex h-10 w-10 items-center justify-center rounded-full text-2xl text-gray-400 transition hover:bg-red-50 hover:text-red-600"
                                            aria-label="Remove PDF"
                                            title="Remove PDF"
                                        >
                                            ×
                                        </button>

                                    </div>

                                </div>

                            </div>

                            {/* Page Previews */}
                            {previews.length >
                                0 && (
                                    <div className="mt-8">

                                        <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">

                                            {previews.map(
                                                (
                                                    preview
                                                ) => {
                                                    const pageIndex =
                                                        preview.pageNumber -
                                                        1;

                                                    const currentRotation =
                                                        pageRotations[
                                                        pageIndex
                                                        ] ||
                                                        0;

                                                    return (
                                                        <div
                                                            key={
                                                                preview.pageNumber
                                                            }
                                                            className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-gray-200"
                                                        >

                                                            {/* Page Preview */}
                                                            <div className="relative flex min-h-[280px] items-center justify-center overflow-hidden rounded-lg bg-gray-100 p-3">

                                                                <img
                                                                    src={
                                                                        preview.imageUrl
                                                                    }
                                                                    alt={`Page ${preview.pageNumber}`}
                                                                    className="max-h-[330px] max-w-full object-contain transition-transform duration-300"
                                                                    style={{
                                                                        transform: `rotate(${currentRotation}deg)`,
                                                                    }}
                                                                />

                                                                {/* Page number */}
                                                                <div className="absolute left-2 top-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-700 shadow">
                                                                    Page{" "}
                                                                    {
                                                                        preview.pageNumber
                                                                    }
                                                                </div>

                                                                {/* Rotation */}
                                                                <div className="absolute right-2 top-2 rounded-full bg-indigo-600 px-3 py-1 text-xs font-semibold text-white shadow">
                                                                    {
                                                                        currentRotation
                                                                    }
                                                                    °
                                                                </div>

                                                            </div>

                                                            {/* Controls */}
                                                            <div className="mt-4 grid grid-cols-3 gap-2">

                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        rotatePageLeft(
                                                                            pageIndex
                                                                        )
                                                                    }
                                                                    className="rounded-lg border border-gray-300 px-2 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                                                                    title="Rotate left"
                                                                >
                                                                    ↶
                                                                </button>

                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        resetPageRotation(
                                                                            pageIndex
                                                                        )
                                                                    }
                                                                    className="rounded-lg border border-gray-300 px-2 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                                                                    title="Reset rotation"
                                                                >
                                                                    0°
                                                                </button>

                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        rotatePageRight(
                                                                            pageIndex
                                                                        )
                                                                    }
                                                                    className="rounded-lg border border-gray-300 px-2 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                                                                    title="Rotate right"
                                                                >
                                                                    ↷
                                                                </button>

                                                            </div>

                                                            <p className="mt-3 text-center text-sm font-medium text-gray-600">
                                                                Rotation:{" "}
                                                                <span className="text-indigo-600">
                                                                    {
                                                                        currentRotation
                                                                    }
                                                                    °
                                                                </span>
                                                            </p>

                                                        </div>
                                                    );
                                                }
                                            )}

                                        </div>

                                    </div>
                                )}

                            {/* Rotate Button */}
                            {previews.length >
                                0 && (
                                    <div className="mt-8">

                                        <button
                                            type="button"
                                            onClick={
                                                handleRotatePdf
                                            }
                                            disabled={
                                                rotating
                                            }
                                            className="w-full rounded-xl bg-indigo-600 px-6 py-4 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                                        >
                                            {rotating
                                                ? "Creating Rotated PDF..."
                                                : "Apply Rotations & Download PDF"}
                                        </button>

                                    </div>
                                )}

                        </>
                    )}

            </div>
        </main>
    );
}