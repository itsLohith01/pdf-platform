const steps = [
    {
        number: "01",
        title: "Choose a PDF tool",
        description:
            "Select the PDF operation you want to perform from our collection of tools.",
    },
    {
        number: "02",
        title: "Upload your file",
        description:
            "Upload the PDF you want to process. Your file is prepared for the selected operation.",
    },
    {
        number: "03",
        title: "Process your PDF",
        description:
            "PDFForge processes your document and performs the selected operation.",
    },
    {
        number: "04",
        title: "Download your result",
        description:
            "Once processing is complete, download your newly generated PDF file.",
    },
];

export default function HowItWorks() {
    return (
        <section
            id="how-it-works"
            className="border-y border-gray-100 bg-gray-50 px-6 py-24"
        >
            <div className="mx-auto max-w-7xl">
                <div className="mx-auto mb-16 max-w-2xl text-center">
                    <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
                        How it works
                    </p>

                    <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                        Simple from start to finish
                    </h2>

                    <p className="mt-4 text-gray-500">
                        Complete your PDF tasks in four simple steps.
                    </p>
                </div>

                <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
                    {steps.map((step) => (
                        <div key={step.number} className="relative text-center">
                            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-black text-lg font-bold text-white">
                                {step.number}
                            </div>

                            <h3 className="text-xl font-semibold text-gray-900">
                                {step.title}
                            </h3>

                            <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-gray-500">
                                {step.description}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}