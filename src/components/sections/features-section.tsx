import {
    FileUp,
    Layers,
    Zap,
    ShieldCheck,
    Settings2,
    Download,
} from "lucide-react";

const features = [
    {
        icon: FileUp,
        title: "Easy Upload",
        description:
            "Upload your PDF files quickly with a simple and intuitive interface.",
    },
    {
        icon: Layers,
        title: "Multiple PDF Tools",
        description:
            "Access essential tools for merging, splitting, compressing, and managing PDFs.",
    },
    {
        icon: Zap,
        title: "Fast Processing",
        description:
            "Process your documents quickly without unnecessary waiting.",
    },
    {
        icon: ShieldCheck,
        title: "Secure & Client-Side",
        description:
            "Your files never leave your device for client-side operations. 100% private and secure.",
    },
    {
        icon: Settings2,
        title: "Simple to Use",
        description:
            "A clean interface makes PDF operations easy for everyone.",
    },
    {
        icon: Download,
        title: "Instant Downloads",
        description:
            "Download your processed documents immediately whenever your task is complete.",
    },
];

export default function FeatureSection() {
    return (
        <section id="features" className="px-6 py-24 bg-white">
            <div className="mx-auto max-w-7xl">
                <div className="mx-auto mb-12 max-w-2xl text-center">
                    <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
                        Features
                    </p>

                    <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                        Everything you need for your PDFs
                    </h2>

                    <p className="mt-4 text-gray-500">
                        Powerful features designed to make working with PDF
                        documents simple, fast, and secure.
                    </p>
                </div>

                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {features.map((feature) => {
                        const Icon = feature.icon;

                        return (
                            <div
                                key={feature.title}
                                className="group rounded-2xl border border-gray-200 bg-gray-50/50 p-6 transition-all duration-200 hover:-translate-y-1 hover:border-gray-300 hover:bg-white hover:shadow-lg"
                            >
                                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 transition-colors duration-200 group-hover:bg-[#5b5bd6] group-hover:text-white">
                                    <Icon className="h-6 w-6" />
                                </div>

                                <h3 className="mb-2 text-lg font-semibold text-gray-900">
                                    {feature.title}
                                </h3>

                                <p className="text-sm leading-6 text-gray-500">
                                    {feature.description}
                                </p>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}