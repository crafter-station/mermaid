import { Hero } from "@/components/hero";
import { Comparison } from "@/components/comparison";
import { Playground } from "@/components/playground";
import { InteractiveDemo } from "@/components/interactive-demo";
import { Features } from "@/components/features";
import { Architecture } from "@/components/architecture";
import { CodeExamples } from "@/components/code-examples";
import { SamplesGallery } from "@/components/samples-gallery";
import { Packages } from "@/components/packages";
import { FooterCTA } from "@/components/footer-cta";
import { Navbar } from "@/components/navbar";

export default function Home() {
	return (
		<>
			<Navbar />
			<main>
				<Hero />
				<Comparison />
				<Playground />
				<InteractiveDemo />
				<Features />
				<Architecture />
				<CodeExamples />
				<SamplesGallery />
				<Packages />
				<FooterCTA />
			</main>
		</>
	);
}
