import Link from "next/link";

export default function HeroSection() {
    return (
        <section className="relative overflow-hidden px-6 pb-20 pt-20 sm:pb-28 sm:pt-28">
            <div className="mx-auto max-w-5xl text-center">
                <div className="mb-6 inline-flex rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-600">
                    Powerful PDF tools. Simple workflow.
                </div>

                <h1 className="text-5xl font-bold tracking-tight text-gray-950 sm:text-6xl lg:text-7xl">
                    Everything you need
                    <br />
                    <span className="text-gray-500">to work with PDFs.</span>
                </h1>

                <p className="mx-auto mt-7 max-w-2xl text-lg leading-8 text-gray-500">
                    Merge, split, compress, convert and manage your PDF documents
                    with a fast and simple workflow.
                </p>

                <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
                    <a
                        href="#tools"
                        className="rounded-xl bg-black px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-gray-800"
                    >
                        Explore PDF Tools
                    </a>

                    <Link
                        href="#how-it-works"
                        className="rounded-xl border border-gray-200 bg-white px-7 py-3.5 text-sm font-semibold text-gray-900 transition hover:bg-gray-50"
                    >
                        How it works
                    </Link>
                </div>
            </div>
        </section>
    );
}