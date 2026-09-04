import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import { promises as fs } from "fs";
import path from "path";
import os from "os";

const execFileAsync = promisify(execFile);

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
    let tempDir = "";

    try {
        const formData = await request.formData();

        const file = formData.get("file");
        const level = formData.get("level")?.toString() || "recommended";

        if (!(file instanceof File)) {
            return NextResponse.json(
                { error: "No PDF file was provided." },
                { status: 400 }
            );
        }

        if (file.type !== "application/pdf") {
            return NextResponse.json(
                { error: "Please upload a valid PDF file." },
                { status: 400 }
            );
        }

        // Convert uploaded file to Buffer
        const inputBuffer = Buffer.from(await file.arrayBuffer());

        // Create temporary working directory
        tempDir = await fs.mkdtemp(
            path.join(os.tmpdir(), "pdfforge-compress-")
        );

        const inputPath = path.join(tempDir, "input.pdf");
        const outputPath = path.join(tempDir, "compressed.pdf");

        await fs.writeFile(inputPath, inputBuffer);

        // Compression profiles
        const compressionSettings: Record<string, string> = {
            low: "/printer",
            recommended: "/ebook",
            high: "/screen",
        };

        const pdfSettings =
            compressionSettings[level] || compressionSettings.recommended;

        // Ghostscript executable
        const ghostscript =
            process.platform === "darwin"
                ? "/opt/homebrew/bin/gs"
                : "gs";

        // Run Ghostscript
        await execFileAsync(ghostscript, [
            "-sDEVICE=pdfwrite",
            "-dCompatibilityLevel=1.4",
            `-dPDFSETTINGS=${pdfSettings}`,
            "-dNOPAUSE",
            "-dQUIET",
            "-dBATCH",
            `-sOutputFile=${outputPath}`,
            inputPath,
        ]);

        // Read compressed PDF
        const compressedBuffer = await fs.readFile(outputPath);

        // Return compressed PDF
        return new NextResponse(compressedBuffer, {
            status: 200,
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": 'attachment; filename="compressed.pdf"',
                "Content-Length": compressedBuffer.length.toString(),
            },
        });
    } catch (error) {
        console.error("PDF compression error:", error);

        return NextResponse.json(
            {
                error: "Unable to compress the PDF.",
            },
            { status: 500 }
        );
    } finally {
        // Clean up temporary files
        if (tempDir) {
            try {
                await fs.rm(tempDir, {
                    recursive: true,
                    force: true,
                });
            } catch (cleanupError) {
                console.error("Cleanup error:", cleanupError);
            }
        }
    }
}