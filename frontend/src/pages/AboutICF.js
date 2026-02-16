import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Check, ChevronRight } from "lucide-react";

export default function AboutICF() {
  const navigate = useNavigate();

  const comparisons = [
    { feature: "R-Value (Insulation)", icf: "R-25+", traditional: "R-13 to R-19", winner: "icf" },
    { feature: "Wind Resistance", icf: "250+ MPH", traditional: "~130 MPH", winner: "icf" },
    { feature: "Fire Rating", icf: "4 Hours", traditional: "~1 Hour", winner: "icf" },
    { feature: "Sound (STC Rating)", icf: "50+", traditional: "33-35", winner: "icf" },
    { feature: "Lifespan", icf: "100+ Years", traditional: "30-50 Years", winner: "icf" },
    { feature: "Upfront Cost", icf: "5-10% More", traditional: "Baseline", winner: "trad" },
    { feature: "Lifetime Cost", icf: "30-40% Less", traditional: "Baseline", winner: "icf" },
    { feature: "Pest Resistance", icf: "Immune", traditional: "Vulnerable", winner: "icf" },
  ];

  const faqs = [
    { q: "What exactly is ICF construction?", a: "ICF (Insulated Concrete Forms) construction uses interlocking foam blocks that are stacked, reinforced with rebar, and filled with concrete. The result is a solid concrete wall with built-in insulation on both sides. Think of it as building with oversized LEGO blocks that create a concrete fortress." },
    { q: "Is ICF more expensive than traditional?", a: "Upfront, ICF typically costs 5-10% more than traditional wood framing. However, the 50-70% energy savings, reduced maintenance, lower insurance premiums, and 100+ year lifespan make it significantly cheaper over the life of the building." },
    { q: "Can ICF be used for any type of building?", a: "Yes! ICF is used for single-family homes, multi-family buildings, commercial structures, swimming pools, and even high-rise buildings. It's incredibly versatile and can accommodate any architectural style." },
    { q: "How long does ICF construction take?", a: "ICF construction typically takes about the same time as traditional framing, sometimes even faster. The stacking process is straightforward, and once poured, the concrete cures quickly. Many contractors report 20-30% faster wall construction." },
    { q: "Is ICF environmentally friendly?", a: "Absolutely. The massive energy savings reduce carbon footprint significantly. ICF uses recycled materials, produces less construction waste, and the structures last 100+ years, reducing the need for rebuilding." },
  ];

  return (
    <div className="pt-16">
      {/* Hero */}
      <section className="relative py-24 noise-bg blueprint-grid">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-12 gap-8 items-center">
            <div className="col-span-12 lg:col-span-6">
              <span className="mono-label mb-4 block">EDUCATION</span>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.05] mb-6" style={{ fontFamily: "'Clash Display', sans-serif" }}>
                WHY<br /><span className="text-primary">ICF?</span>
              </h1>
              <p className="text-base md:text-lg text-muted-foreground max-w-lg mb-8">
                Insulated Concrete Forms represent the most significant advancement in residential construction in decades. Here's everything you need to know.
              </p>
              <Button
                data-testid="about-get-quote-btn"
                onClick={() => navigate("/get-quote")}
                className="rounded-sm text-xs tracking-widest font-bold uppercase px-6 py-3 hard-shadow"
                size="lg"
              >
                GET A FREE QUOTE <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
            <div className="col-span-12 lg:col-span-6">
              <div className="img-overlay rounded-sm overflow-hidden">
                <img
                  src="https://customer-assets.emergentagent.com/job_construct-connect-20/artifacts/jjavbxab_rcrest.jpeg"
                  alt="Aerial view of ICF construction project"
                  className="w-full h-auto max-h-[60vh] object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What is ICF */}
      <section data-testid="what-is-icf-section" className="py-24 bg-card">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-12 gap-12">
            <div className="col-span-12 lg:col-span-5">
              <span className="mono-label mb-3 block">THE BASICS</span>
              <h2 className="text-3xl sm:text-4xl font-bold mb-6" style={{ fontFamily: "'Clash Display', sans-serif" }}>
                What Are <span className="text-primary">ICFs?</span>
              </h2>
            </div>
            <div className="col-span-12 lg:col-span-7 space-y-6">
              <p className="text-base text-muted-foreground leading-relaxed">
                Insulated Concrete Forms (ICFs) are hollow foam blocks that interlock together like building blocks. Once stacked into the shape of walls, they're reinforced with steel rebar and filled with concrete.
              </p>
              <p className="text-base text-muted-foreground leading-relaxed">
                The result? A monolithic concrete wall sandwiched between two layers of high-performance insulation. This creates structures that are dramatically stronger, more energy-efficient, and more durable than anything built with traditional wood framing.
              </p>
              <div className="grid grid-cols-2 gap-4 pt-4">
                {["Foam blocks interlock", "Steel rebar reinforcement", "Concrete-filled core", "Built-in insulation"].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <div className="w-5 h-5 bg-primary/10 rounded-sm flex items-center justify-center">
                      <Check className="w-3 h-3 text-primary" />
                    </div>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section data-testid="comparison-section" className="py-24 noise-bg">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="mb-16">
            <span className="mono-label mb-3 block">HEAD TO HEAD</span>
            <h2 className="text-3xl sm:text-4xl font-bold" style={{ fontFamily: "'Clash Display', sans-serif" }}>
              ICF vs <span className="text-primary">Traditional</span>
            </h2>
          </div>

          <div className="bg-card border border-border rounded-sm overflow-hidden">
            <div className="grid grid-cols-3 bg-secondary text-secondary-foreground p-4">
              <div className="mono-label text-secondary-foreground/60">METRIC</div>
              <div className="mono-label text-primary text-center">ICF</div>
              <div className="mono-label text-secondary-foreground/60 text-center">TRADITIONAL</div>
            </div>
            {comparisons.map((row, i) => (
              <div key={i} className={`grid grid-cols-3 p-4 ${i % 2 === 0 ? "bg-card" : "bg-muted/30"} border-t border-border`}>
                <div className="text-sm font-medium">{row.feature}</div>
                <div className={`text-sm text-center font-semibold ${row.winner === "icf" ? "text-primary" : ""}`}>{row.icf}</div>
                <div className={`text-sm text-center ${row.winner === "trad" ? "text-primary font-semibold" : "text-muted-foreground"}`}>{row.traditional}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Interior showcase */}
      <section className="py-24 bg-card">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-12 gap-8 items-center">
            <div className="col-span-12 lg:col-span-6">
              <div className="img-overlay rounded-sm overflow-hidden">
                <img
                  src="https://customer-assets.emergentagent.com/job_icfhub/artifacts/kq1ktxqv_4CFB81B4-A9ED-4117-BD5D-1880FC9FEC83.jpeg"
                  alt="Completed ICF mansion exterior"
                  className="w-full h-auto max-h-[60vh] object-cover"
                />
              </div>
            </div>
            <div className="col-span-12 lg:col-span-6">
              <span className="mono-label mb-3 block">AESTHETICS</span>
              <h2 className="text-3xl sm:text-4xl font-bold mb-6" style={{ fontFamily: "'Clash Display', sans-serif" }}>
                Beautiful <span className="text-primary">Inside & Out</span>
              </h2>
              <p className="text-base text-muted-foreground leading-relaxed mb-6">
                ICF homes can be finished with any exterior or interior material — stucco, brick, stone, siding, drywall. From the outside, nobody can tell it's ICF. But you'll feel the difference every day in comfort, quiet, and energy savings.
              </p>
              <div className="space-y-3">
                {["Any architectural style possible", "Compatible with all finishes", "Consistent indoor temperature", "Ultra-quiet interior spaces"].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    <Check className="w-4 h-4 text-primary flex-shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section data-testid="faq-section" className="py-24 noise-bg">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="mb-16">
            <span className="mono-label mb-3 block">FAQ</span>
            <h2 className="text-3xl sm:text-4xl font-bold" style={{ fontFamily: "'Clash Display', sans-serif" }}>
              Common <span className="text-primary">Questions</span>
            </h2>
          </div>

          <div className="space-y-4 max-w-3xl">
            {faqs.map((faq, i) => (
              <details key={i} className="bg-card border border-border rounded-sm group" data-testid={`faq-item-${i}`}>
                <summary className="p-6 cursor-pointer text-sm font-semibold flex items-center justify-between hover:text-primary transition-colors">
                  {faq.q}
                  <ChevronRight className="w-4 h-4 flex-shrink-0 transition-transform group-open:rotate-90" />
                </summary>
                <div className="px-6 pb-6 text-sm text-muted-foreground leading-relaxed border-t border-dashed border-border pt-4">
                  {faq.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-secondary text-secondary-foreground text-center">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ fontFamily: "'Clash Display', sans-serif" }}>
            Convinced? <span className="text-primary">Let's Build.</span>
          </h2>
          <p className="text-base text-secondary-foreground/60 mb-8 max-w-md mx-auto">
            Get connected with certified ICF contractors in your area today.
          </p>
          <Button
            data-testid="about-cta-btn"
            onClick={() => navigate("/get-quote")}
            className="rounded-sm text-xs tracking-widest font-bold uppercase px-8 py-3"
            size="lg"
          >
            GET YOUR FREE QUOTE <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </section>
    </div>
  );
}
