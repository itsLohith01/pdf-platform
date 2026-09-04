import HeroSection from "@/components/hero/hero-section";
import ToolsSection from "@/components/sections/tools-section";
import HowItWorks from "@/components/sections/how-it-works";

export default function Home() {
    return (
        <main>
            <HeroSection />
            <ToolsSection />
            <HowItWorks />
        </main>
    );
}