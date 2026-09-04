import Link from "next/link";
import type { LucideIcon } from "lucide-react";

interface ToolCardProps {
    name: string;
    description: string;
    icon: LucideIcon;
    href: string;
}

export default function ToolCard({
    name,
    description,
    icon: Icon,
    href,
}: ToolCardProps) {
    return (
        <Link
            href={href}
            className="group rounded-2xl border border-gray-200 bg-white p-6 transition-all duration-200 hover:-translate-y-1 hover:border-gray-300 hover:shadow-lg"
        >
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 transition-colors group-hover:bg-black group-hover:text-white">
                <Icon className="h-6 w-6" />
            </div>

            <h3 className="mb-2 text-lg font-semibold text-gray-900">
                {name}
            </h3>

            <p className="text-sm leading-6 text-gray-500">
                {description}
            </p>

            <div className="mt-5 text-sm font-medium text-gray-900">
                Try tool →
            </div>
        </Link>
    );
}