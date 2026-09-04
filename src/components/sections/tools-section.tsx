import { pdfTools } from "@/data/tools";
import ToolCard from "@/components/tools/tool-card";

export default function ToolsSection() {
    return (
        <section id="tools" className="px-6 py-24">
            <div className="mx-auto max-w-7xl">
                <div className="mx-auto mb-12 max-w-2xl text-center">
                    <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
                        PDF Tools
                    </p>

                    <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                        Everything you need to work with PDFs
                    </h2>

                    <p className="mt-4 text-gray-500">
                        Simple, powerful tools for managing your documents.
                    </p>
                </div>

                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {pdfTools.map((tool) => (
                        <ToolCard key={tool.id} {...tool} />
                    ))}
                </div>
            </div>
        </section>
    );
}