import HeroSection from "@/components/hero/hero-section";
import ToolsSection from "@/components/sections/tools-section";
import FeatureSection from "@/components/sections/features-section";
import HowItWorks from "@/components/sections/how-it-works";

export default function Home() {
    return (
        <main>
            <HeroSection />
            <ToolsSection />
            <FeatureSection />
            <HowItWorks />
        </main>
    );
}