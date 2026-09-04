import { NextResponse } from "next/server";
import {
    Document,
    Packer,
    Paragraph,
    ImageRun,
} from "docx";

export const runtime = "nodejs";

export async function POST(request: Request) {
    try {
        const formData = await request.formData();

        const file = formData.get("file");
        const pageImages = formData.getAll("pageImages");

        if (!(file instanceof File)) {
            return NextResponse.json(
                {
                    error: "No PDF file was provided.",
                },
                {
                    status: 400,
                }
            );
        }

        if (file.type !== "application/pdf") {
            return NextResponse.json(
                {
                    error: "Please upload a valid PDF file.",
                },
                {
                    status: 400,
                }
            );
        }

        if (pageImages.length === 0) {
            return NextResponse.json(
                {
                    error: "No PDF pages were rendered.",
                },
                {
                    status: 400,
                }
            );
        }

        const children: Paragraph[] = [];

        /*
         * Add every rendered PDF page
         * as an image inside the Word document.
         */
        for (let i = 0; i < pageImages.length; i++) {
            const image = pageImages[i];

            if (!(image instanceof File)) {
                continue;
            }

            const imageBuffer = await image.arrayBuffer();

            /*
             * Keep the page at a Word-friendly width.
             */
            const maxWidth = 600;

            /*
             * Images are rendered by the browser
             * using the original PDF page dimensions.
             *
             * We use a standard page ratio here.
             */
            const imageWidth = maxWidth;
            const imageHeight = Math.round(
                maxWidth * 1.414
            );

            children.push(
                new Paragraph({
                    children: [
                        new ImageRun({
                            data: new Uint8Array(
                                imageBuffer
                            ),
                            transformation: {
                                width: imageWidth,
                                height: imageHeight,
                            },
                            type: "png",
                        }),
                    ],
                })
            );

            /*
             * Add page break between PDF pages.
             */
            if (i < pageImages.length - 1) {
                children.push(
                    new Paragraph({
                        pageBreakBefore: true,
                    })
                );
            }
        }

        const document = new Document({
            sections: [
                {
                    properties: {},
                    children,
                },
            ],
        });

        const docxBuffer =
            await Packer.toBuffer(document);

        const baseName = file.name.replace(
            /\.pdf$/i,
            ""
        );

        const outputName =
            `converted-${baseName}.docx`;

        return new NextResponse(
            new Uint8Array(docxBuffer),
            {
                status: 200,

                headers: {
                    "Content-Type":
                        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

                    "Content-Disposition":
                        `attachment; filename="${outputName}"`,

                    "Content-Length":
                        docxBuffer.length.toString(),
                },
            }
        );
    } catch (error) {
        console.error(
            "PDF to Word conversion error:",
            error
        );

        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to convert PDF to Word.",
            },
            {
                status: 500,
            }
        );
    }
}