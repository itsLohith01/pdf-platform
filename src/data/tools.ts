import {
    Combine,
    Scissors,
    Minimize2,
    FileText,
    RotateCw,
    Lock,
} from "lucide-react";

export const pdfTools = [
    {
        id: "merge-pdf",
        name: "Merge PDF",
        description: "Combine multiple PDF files into one document.",
        icon: Combine,
        href: "/merge-pdf",
    },

    {
        id: "split-pdf",
        name: "Split PDF",
        description: "Separate pages from a PDF into individual files.",
        icon: Scissors,
        href: "/split-pdf",
    },

    {
        id: "compress-pdf",
        name: "Compress PDF",
        description: "Reduce PDF file size while maintaining quality.",
        icon: Minimize2,
        href: "/compress-pdf",
    },

    {
        id: "pdf-to-word",
        name: "PDF to Word",
        description: "Convert PDF documents into editable Word files.",
        icon: FileText,
        href: "/pdf-to-word",
    },

    {
        id: "rotate-pdf",
        name: "Rotate PDF",
        description: "Rotate PDF pages to the correct orientation.",
        icon: RotateCw,
        href: "/rotate-pdf",
    },

    {
        id: "protect-pdf",
        name: "Protect PDF",
        description: "Secure your PDF with password protection.",
        icon: Lock,
        href: "/protect-pdf",
    },
];