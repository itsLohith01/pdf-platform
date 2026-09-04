"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { PDFDocument } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

interface Preview {
    id: string;
    url: string;
}

export default function MergePdfPage() {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [files, setFiles] = useState<File[]>([]);
    const [previews, setPreviews] = useState<Preview[]>([]);
    const [isMerging, setIsMerging] = useState(false);
    const [mergeComplete, setMergeComplete] = useState(false);
    const [mergedPdfUrl, setMergedPdfUrl] = useState("");
    const [error, setError] = useState("");
    const [isDragging, setIsDragging] = useState(false);

    useEffect(() => {
        let cancelled = false;

        const generatePreviews = async () => {
            const generated: Preview[] = [];

            for (let index = 0; index < files.length; index++) {
                const file = files[index];

                try {
                    const arrayBuffer = await file.arrayBuffer();

                    const pdf = await pdfjsLib.getDocument({
                        data: arrayBuffer,
                    }).promise;

                    const page = await pdf.getPage(1);

                    const viewport = page.getViewport({
                        scale: 0.8,
                    });

                    const canvas = document.createElement("canvas");
                    const context = canvas.getContext("2d");

                    if (!context) {
                        continue;
                    }

                    canvas.width = viewport.width;
                    canvas.height = viewport.height;

                    await page.render({
                        canvas,
                        canvasContext: context,
                        viewport,
                    }).promise;

                    generated.push({
                        id: `${file.name}-${file.size}-${file.lastModified}-${index}`,
                        url: canvas.toDataURL("image/png"),
                    });
                } catch (previewError) {
                    console.error(
                        "Could not generate PDF preview:",
                        previewError
                    );
                }
            }

            if (!cancelled) {
                setPreviews(generated);
            }
        };

        if (files.length > 0) {
            generatePreviews();
        } else {
            setPreviews([]);
        }

        return () => {
            cancelled = true;
        };
    }, [files]);
    const addPdfFiles = (selectedFiles: File[]) => {
        const pdfFiles = selectedFiles.filter(
            (file) =>
                file.type === "application/pdf" ||
                file.name.toLowerCase().endsWith(".pdf")
        );

        if (pdfFiles.length === 0) {
            setError("Please select PDF files only.");
            return;
        }

        setFiles((currentFiles) => [
            ...currentFiles,
            ...pdfFiles,
        ]);

        setError("");
    };
    const handleDragOver = (
        event: React.DragEvent<HTMLDivElement>
    ) => {
        event.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (
        event: React.DragEvent<HTMLDivElement>
    ) => {
        event.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (
        event: React.DragEvent<HTMLDivElement>
    ) => {
        event.preventDefault();
        setIsDragging(false);

        const droppedFiles = Array.from(event.dataTransfer.files);

        addPdfFiles(droppedFiles);
    };
    const handleFileChange = (
        event: React.ChangeEvent<HTMLInputElement>
    ) => {
        const selectedFiles = Array.from(event.target.files || []);

        addPdfFiles(selectedFiles);

        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const removeFile = (indexToRemove: number) => {
        setFiles((currentFiles) =>
            currentFiles.filter(
                (_, index) => index !== indexToRemove
            )
        );

        setError("");
    };

    const moveFile = (
        currentIndex: number,
        newIndex: number
    ) => {
        if (
            newIndex < 0 ||
            newIndex >= files.length
        ) {
            return;
        }

        setFiles((currentFiles) => {
            const updatedFiles = [...currentFiles];

            const [movedFile] = updatedFiles.splice(
                currentIndex,
                1
            );

            updatedFiles.splice(
                newIndex,
                0,
                movedFile
            );

            return updatedFiles;
        });

        setError("");
    };

    const handleMerge = async () => {
        if (files.length < 2) {
            setError(
                "Please select at least two PDF files to merge."
            );
            return;
        }

        try {
            setIsMerging(true);
            setMergeComplete(false);
            setMergedPdfUrl("");
            setError("");

            const mergedPdf = await PDFDocument.create();

            for (const file of files) {
                const fileBytes = await file.arrayBuffer();

                const pdf = await PDFDocument.load(fileBytes);

                const pages = await mergedPdf.copyPages(
                    pdf,
                    pdf.getPageIndices()
                );

                pages.forEach((page) => {
                    mergedPdf.addPage(page);
                });
            }

            const mergedPdfBytes = await mergedPdf.save();

            const blob = new Blob(
                [new Uint8Array(mergedPdfBytes)],
                {
                    type: "application/pdf",
                }
            );

            const url = URL.createObjectURL(blob);

            setMergedPdfUrl(url);
            setMergeComplete(true);
        } catch (mergeError) {
            console.error(mergeError);

            setError(
                "Something went wrong while merging the PDFs. Please try again."
            );
        } finally {
            setIsMerging(false);
        }
    };

    return (
        <main className="min-h-screen bg-gray-50 px-6 py-16">
            <div className="mx-auto max-w-4xl">

                <Link
                    href="/"
                    className="mb-8 inline-flex items-center text-sm font-medium text-gray-500 transition hover:text-black"
                >
                    ← Back to PDFForge
                </Link>

                <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm sm:p-12">

                    <div className="mx-auto max-w-2xl text-center">

                        <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
                            PDF Tool
                        </p>

                        <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                            Merge PDF
                        </h1>

                        <p className="mt-4 text-gray-500">
                            Combine multiple PDF files into a single document
                            quickly and easily.
                        </p>

                    </div>

                    <div
                        onClick={() =>
                            fileInputRef.current?.click()
                        }
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className={`mt-10 cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition ${isDragging
                            ? "border-black bg-gray-100"
                            : "border-gray-300 bg-gray-50 hover:border-gray-400"
                            }`}
                    >

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="application/pdf"
                            multiple
                            onChange={handleFileChange}
                            className="hidden"
                        />

                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm">
                            <span className="text-2xl">
                                📄
                            </span>
                        </div>

                        <h2 className="mt-5 text-lg font-semibold text-gray-900">
                            Drag & drop your PDF files here
                        </h2>

                        <p className="mt-2 text-sm text-gray-500">
                            Drop your PDF files here, or choose files from your computer.
                        </p>

                        <button
                            type="button"
                            onClick={(event) => {
                                event.stopPropagation();
                                fileInputRef.current?.click();
                            }}
                            className="mt-6 rounded-xl bg-black px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-gray-800"
                        >
                            Choose PDF Files
                        </button>

                        <p className="mt-4 text-xs text-gray-400">
                            PDF files only
                        </p>

                    </div>

                    {files.length > 0 && (
                        <div className="mt-8">

                            <div className="flex items-center justify-between">

                                <h3 className="text-lg font-semibold text-gray-900">
                                    Selected Files
                                </h3>

                                <span className="text-sm text-gray-400">
                                    {files.length}{" "}
                                    {files.length === 1
                                        ? "file"
                                        : "files"}
                                </span>

                            </div>

                            <div className="mt-4 space-y-4">

                                {files.map((file, index) => {

                                    const preview =
                                        previews[index];

                                    return (
                                        <div
                                            key={`${file.name}-${file.size}-${file.lastModified}-${index}`}
                                            className="flex items-center gap-5 rounded-2xl border border-gray-200 bg-white p-4 transition hover:border-gray-300"
                                        >

                                            <div className="flex h-28 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50">

                                                {preview ? (
                                                    <img
                                                        src={preview.url}
                                                        alt={`Preview of ${file.name}`}
                                                        className="h-full w-full object-contain"
                                                    />
                                                ) : (
                                                    <div className="text-xl">
                                                        📄
                                                    </div>
                                                )}

                                            </div>

                                            <div className="min-w-0 flex-1">

                                                <p className="truncate text-sm font-semibold text-gray-900">
                                                    {file.name}
                                                </p>

                                                <p className="mt-1 text-sm text-gray-400">
                                                    {(
                                                        file.size /
                                                        1024 /
                                                        1024
                                                    ).toFixed(2)}{" "}
                                                    MB
                                                </p>

                                                <span className="mt-2 inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-500">
                                                    PDF
                                                </span>

                                            </div>

                                            <div className="flex shrink-0 flex-col items-end gap-2">

                                                <div className="flex items-center gap-2">

                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            moveFile(
                                                                index,
                                                                index - 1
                                                            )
                                                        }
                                                        disabled={
                                                            index === 0
                                                        }
                                                        className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-30"
                                                    >
                                                        ↑
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            moveFile(
                                                                index,
                                                                index + 1
                                                            )
                                                        }
                                                        disabled={
                                                            index ===
                                                            files.length - 1
                                                        }
                                                        className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-30"
                                                    >
                                                        ↓
                                                    </button>

                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        removeFile(index)
                                                    }
                                                    className="text-sm font-medium text-gray-400 transition hover:text-red-500"
                                                >
                                                    Remove
                                                </button>

                                            </div>

                                        </div>
                                    );
                                })}

                            </div>

                            {error && (
                                <p className="mt-4 text-sm font-medium text-red-600">
                                    {error}
                                </p>
                            )}

                            {!mergeComplete ? (
                                <button
                                    type="button"
                                    onClick={handleMerge}
                                    disabled={isMerging}
                                    className="mt-6 w-full rounded-xl bg-black px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {isMerging ? "Merging PDFs..." : "Merge PDFs"}
                                </button>
                            ) : (
                                <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-6 text-center">
                                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-black text-xl text-white">
                                        ✓
                                    </div>

                                    <h3 className="mt-4 text-lg font-semibold text-gray-900">
                                        PDFs merged successfully!
                                    </h3>

                                    <p className="mt-2 text-sm text-gray-500">
                                        Your merged PDF is ready to download.
                                    </p>

                                    <a
                                        href={mergedPdfUrl}
                                        download="merged.pdf"
                                        className="mt-5 inline-flex rounded-xl bg-black px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-gray-800"
                                    >
                                        Download Merged PDF
                                    </a>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setMergeComplete(false);
                                            setMergedPdfUrl("");
                                        }}
                                        className="mt-3 block w-full text-sm font-medium text-gray-500 transition hover:text-black"
                                    >
                                        Merge More PDFs
                                    </button>
                                </div>
                            )}

                        </div>
                    )}

                </div>
            </div>
        </main>
    );
}