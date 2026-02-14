import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Check, ArrowRight } from "lucide-react";

export default function PricingPage() {
  const navigate = useNavigate();

  const plans = [
    {
      name: "STARTER",
      price: "Free",
      period: "",
      desc: "Get listed and start receiving leads.",
      features: [
        "Basic contractor profile",
        "Appear in directory",
        "Up to 3 leads/month",
        "Email notifications",
      ],
      cta: "GET STARTED",
      featured: false,
    },
    {
      name: "PROFESSIONAL",
      price: "$99",
      period: "/month",
      desc: "For serious contractors who want more leads.",
      features: [
        "Featured profile listing",
        "Unlimited leads",
        "Priority lead matching",
        "Lead status management",
        "Phone + email support",
        "Profile badge: Verified Pro",
      ],
      cta: "GO PROFESSIONAL",
      featured: true,
    },
    {
      name: "ENTERPRISE",
      price: "$249",
      period: "/month",
      desc: "For teams and multi-location contractors.",
      features: [
        "Everything in Professional",
        "Multiple team members",
        "Exclusive territory leads",
        "Custom branding",
        "Dedicated account manager",
        "API access",
        "Advanced analytics",
      ],
      cta: "CONTACT SALES",
      featured: false,
    },
  ];

  return (
    <div className="pt-16">
      <section className="py-24 noise-bg blueprint-grid">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="mono-label mb-3 block">CONTRACTOR PLANS</span>
            <h1 className="text-4xl sm:text-5xl font-bold mb-4" style={{ fontFamily: "'Clash Display', sans-serif" }}>
              Grow Your <span className="text-primary">ICF Business</span>
            </h1>
            <p className="text-base text-muted-foreground max-w-md mx-auto">
              Choose a plan that matches your goals. Cancel anytime.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {plans.map((plan, i) => (
              <div
                key={i}
                data-testid={`pricing-card-${i}`}
                className={`relative bg-card border rounded-sm p-8 flex flex-col ${
                  plan.featured
                    ? "border-primary scale-[1.02] shadow-lg"
                    : "border-border"
                } tech-corner hover:border-primary/30 transition-all`}
              >
                {plan.featured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-primary text-primary-foreground text-[10px] tracking-widest font-bold uppercase px-4 py-1 rounded-sm">
                      MOST POPULAR
                    </span>
                  </div>
                )}

                <div className="mb-6">
                  <span className="mono-label text-muted-foreground">{plan.name}</span>
                  <div className="flex items-baseline gap-1 mt-2">
                    <span className="stat-value text-4xl">{plan.price}</span>
                    {plan.period && <span className="text-sm text-muted-foreground">{plan.period}</span>}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">{plan.desc}</p>
                </div>

                <div className="space-y-3 mb-8 flex-1">
                  {plan.features.map((f, j) => (
                    <div key={j} className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary flex-shrink-0" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>

                <Button
                  data-testid={`pricing-cta-${i}`}
                  onClick={() => navigate("/auth")}
                  variant={plan.featured ? "default" : "outline"}
                  className="w-full rounded-sm text-xs tracking-widest font-bold uppercase py-3"
                >
                  {plan.cta} <ArrowRight className="w-3 h-3 ml-2" />
                </Button>
              </div>
            ))}
          </div>

          <div className="mt-16 text-center">
            <p className="text-sm text-muted-foreground">
              All plans include a 14-day free trial. No credit card required.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
