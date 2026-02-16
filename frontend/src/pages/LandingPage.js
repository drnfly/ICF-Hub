import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Shield, Flame, Wind, Volume2, Timer, DollarSign, ChevronRight } from "lucide-react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function LandingPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ contractors: 47, leads: 230, projects_completed: 200, energy_savings: "50-70%" });

  useEffect(() => {
    axios.get(`${API}/stats`).then(r => setStats(r.data)).catch(() => {});
  }, []);

  const benefits = [
    { icon: DollarSign, title: "50-70% Energy Savings", desc: "ICF walls provide R-25+ insulation value, dramatically reducing heating and cooling costs for the lifetime of the building.", span: "col-span-12 md:col-span-8" },
    { icon: Wind, title: "250 MPH Wind Rating", desc: "Withstands Category 5 hurricanes and F4 tornadoes.", span: "col-span-12 md:col-span-4" },
    { icon: Flame, title: "4-Hour Fire Rating", desc: "Concrete core provides superior fire resistance.", span: "col-span-12 md:col-span-4" },
    { icon: Volume2, title: "STC 50+ Sound Rating", desc: "Blocks outside noise 3x better than traditional framing, creating whisper-quiet interiors.", span: "col-span-12 md:col-span-8" },
  ];

  const steps = [
    { num: "01", title: "Tell Us Your Vision", desc: "Submit your project details through our smart form. Location, size, timeline, budget — we capture it all." },
    { num: "02", title: "Get Matched", desc: "Our platform connects you with certified ICF contractors in your area who specialize in your project type." },
    { num: "03", title: "Compare & Choose", desc: "Review contractor profiles, portfolios, and ratings. Get competitive quotes from top professionals." },
    { num: "04", title: "Build With Confidence", desc: "Your contractor builds your ICF project. Stronger, smarter, and more efficient than traditional construction." },
  ];

  return (
    <div className="pt-16">
      {/* Hero */}
      <section data-testid="hero-section" className="relative noise-bg overflow-hidden">
        <div className="blueprint-grid min-h-[85vh] flex items-center">
          <div className="max-w-7xl mx-auto px-6 lg:px-8 py-20 w-full">
            <div className="grid grid-cols-12 gap-8 items-center">
              <div className="col-span-12 lg:col-span-7">
                <div className="mono-label mb-4 animate-fade-up" style={{ animationDelay: "0.1s" }}>
                  THE FUTURE OF CONSTRUCTION
                </div>
                <h1
                  className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.05] mb-6 animate-fade-up"
                  style={{ fontFamily: "'Clash Display', sans-serif", animationDelay: "0.2s" }}
                >
                  BUILD<br />
                  <span className="text-primary">STRONGER.</span><br />
                  BUILD SMARTER.
                </h1>
                <p className="text-base md:text-lg text-muted-foreground max-w-lg mb-8 animate-fade-up" style={{ animationDelay: "0.3s" }}>
                  Connect with certified ICF contractors and discover why insulated concrete forms are revolutionizing how we build homes.
                </p>
                <div className="flex flex-wrap gap-4 animate-fade-up" style={{ animationDelay: "0.4s" }}>
                  <Button
                    data-testid="hero-get-quote-btn"
                    onClick={() => navigate("/get-quote")}
                    className="rounded-sm text-xs tracking-widest font-bold uppercase px-6 py-3 hard-shadow"
                    size="lg"
                  >
                    GET A FREE QUOTE <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                  <Button
                    data-testid="hero-find-contractors-btn"
                    variant="outline"
                    onClick={() => navigate("/contractors")}
                    className="rounded-sm text-xs tracking-widest font-bold uppercase px-6 py-3 border-2"
                    size="lg"
                  >
                    FIND CONTRACTORS
                  </Button>
                </div>
              </div>

              <div className="col-span-12 lg:col-span-5 animate-slide-right" style={{ animationDelay: "0.3s" }}>
                <div className="relative">
                  <div className="img-overlay rounded-sm overflow-hidden">
                    <img
                      src="https://customer-assets.emergentagent.com/job_construct-connect-20/artifacts/jz33d2mk_20251109_030327-COLLAGE.jpg"
                      alt="ICF construction projects collage"
                      className="w-full h-auto max-h-[70vh] object-cover"
                    />
                  </div>
                  <div className="absolute bottom-4 left-4 glass px-4 py-3 rounded-sm">
                    <div className="mono-label mb-1">WALL PERFORMANCE</div>
                    <div className="flex gap-4 text-xs font-semibold">
                      <span>R-VALUE: <span className="text-primary">25+</span></span>
                      <span>STC: <span className="text-primary">50+</span></span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section data-testid="stats-section" className="bg-secondary text-secondary-foreground py-12">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { val: `${stats.projects_completed}+`, label: "PROJECTS COMPLETED" },
              { val: `${stats.contractors}+`, label: "CERTIFIED CONTRACTORS" },
              { val: stats.energy_savings, label: "AVG ENERGY SAVINGS" },
              { val: `${stats.leads}+`, label: "HOMEOWNERS SERVED" },
            ].map((s, i) => (
              <div key={i} className="text-center md:text-left">
                <div className="stat-value text-3xl sm:text-4xl lg:text-5xl text-primary mb-1">{s.val}</div>
                <div className="mono-label text-secondary-foreground/50">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Bento */}
      <section data-testid="benefits-section" className="py-24 blueprint-grid">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="mb-16">
            <span className="mono-label mb-3 block">WHY CHOOSE ICF</span>
            <h2 className="text-3xl sm:text-4xl font-bold" style={{ fontFamily: "'Clash Display', sans-serif" }}>
              Superior Performance.<br />
              <span className="text-primary">Every Metric.</span>
            </h2>
          </div>

          <div className="grid grid-cols-12 gap-4">
            {benefits.map((b, i) => (
              <div
                key={i}
                className={`${b.span} relative bg-card border border-border p-8 rounded-sm tech-corner hover:border-primary/30 transition-all duration-300 hover:scale-[1.01] group`}
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-sm flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                    <b.icon className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold mb-2" style={{ fontFamily: "'Clash Display', sans-serif" }}>{b.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{b.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Showcase Image */}
      <section className="py-0">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="img-overlay rounded-sm overflow-hidden">
            <img
              src="https://customer-assets.emergentagent.com/job_construct-connect-20/artifacts/xkewk52l_481463930_122115111320712921_5873153101332231783_n.jpg"
              alt="Large-scale ICF construction project"
              className="w-full h-[40vh] object-cover"
            />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section data-testid="how-it-works-section" className="py-24 bg-card">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="mb-16">
            <span className="mono-label mb-3 block">PROCESS</span>
            <h2 className="text-3xl sm:text-4xl font-bold" style={{ fontFamily: "'Clash Display', sans-serif" }}>
              From Vision to <span className="text-primary">Reality</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step, i) => (
              <div key={i} className="relative p-6 border border-dashed border-border rounded-sm group hover:border-primary/40 transition-all">
                <div className="stat-value text-5xl text-primary/20 mb-4 group-hover:text-primary/40 transition-colors">{step.num}</div>
                <h3 className="text-base font-bold mb-2" style={{ fontFamily: "'Clash Display', sans-serif" }}>{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
                {i < steps.length - 1 && (
                  <ChevronRight className="hidden lg:block absolute right-[-18px] top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/30" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section data-testid="testimonials-section" className="py-24 noise-bg">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="mb-16">
            <span className="mono-label mb-3 block">TESTIMONIALS</span>
            <h2 className="text-3xl sm:text-4xl font-bold" style={{ fontFamily: "'Clash Display', sans-serif" }}>
              What Homeowners <span className="text-primary">Say</span>
            </h2>
          </div>

          <div className="grid grid-cols-12 gap-4">
            {[
              { name: "Sarah M.", location: "Austin, TX", text: "Our ICF home survived a direct tornado hit with zero structural damage. Our neighbors weren't as fortunate. Best building decision we ever made.", span: "col-span-12 md:col-span-8" },
              { name: "David K.", location: "Denver, CO", text: "Energy bills dropped 62% compared to our old stick-built home. The house pays for itself.", span: "col-span-12 md:col-span-4" },
              { name: "Lisa R.", location: "Miami, FL", text: "Hurricane season is no longer stressful. Our ICF home is a fortress.", span: "col-span-12 md:col-span-5" },
              { name: "Tom & Janet P.", location: "Portland, OR", text: "The sound insulation is incredible. We live near a highway and can't hear a thing inside. Plus our heating bill is a fraction of what it used to be.", span: "col-span-12 md:col-span-7" },
            ].map((t, i) => (
              <div key={i} className={`${t.span} bg-card border border-border p-8 rounded-sm relative tech-corner`}>
                <p className="text-sm leading-relaxed text-foreground/80 mb-6 italic">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-sm">
                    {t.name[0]}
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{t.name}</div>
                    <div className="mono-label">{t.location}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section data-testid="cta-section" className="py-24 bg-secondary text-secondary-foreground">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6" style={{ fontFamily: "'Clash Display', sans-serif" }}>
            Ready to Build <span className="text-primary">Better?</span>
          </h2>
          <p className="text-base text-secondary-foreground/60 max-w-xl mx-auto mb-10">
            Get matched with certified ICF contractors in your area. Free quotes, no obligation.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button
              data-testid="cta-get-quote-btn"
              onClick={() => navigate("/get-quote")}
              className="rounded-sm text-xs tracking-widest font-bold uppercase px-8 py-3"
              size="lg"
            >
              GET YOUR FREE QUOTE <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button
              data-testid="cta-contractor-btn"
              variant="outline"
              onClick={() => navigate("/auth")}
              className="rounded-sm text-xs tracking-widest font-bold uppercase px-8 py-3 border-secondary-foreground/20 text-secondary-foreground hover:bg-secondary-foreground/10"
              size="lg"
            >
              JOIN AS CONTRACTOR
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
