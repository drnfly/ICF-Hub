import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowRight, Check, Loader2 } from "lucide-react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function GetQuote() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "", email: "", phone: "", city: "", state: "",
    project_type: "", project_size: "", budget_range: "", timeline: "", description: ""
  });

  const update = (key, val) => setForm(p => ({ ...p, [key]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.phone || !form.project_type) {
      toast.error("Please fill in all required fields");
      return;
    }
    setLoading(true);
    try {
      await axios.post(`${API}/leads`, form);
      setSubmitted(true);
      toast.success("Project inquiry submitted successfully!");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="pt-16 min-h-screen flex items-center justify-center noise-bg blueprint-grid">
        <div className="text-center max-w-md px-6" data-testid="quote-success">
          <div className="w-16 h-16 bg-primary/10 rounded-sm flex items-center justify-center mx-auto mb-6">
            <Check className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-3xl font-bold mb-4" style={{ fontFamily: "'Clash Display', sans-serif" }}>
            Request <span className="text-primary">Received</span>
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            We've received your project details. Certified ICF contractors in your area will be in touch with quotes within 24-48 hours.
          </p>
          <Button
            data-testid="quote-back-home-btn"
            onClick={() => window.location.href = "/"}
            className="rounded-sm text-xs tracking-widest font-bold uppercase px-6 py-3"
          >
            BACK TO HOME
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-16">
      <section className="py-20 noise-bg blueprint-grid">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-12 gap-12">
            <div className="col-span-12 lg:col-span-4">
              <span className="mono-label mb-3 block">PROJECT BRIEF</span>
              <h1 className="text-4xl sm:text-5xl font-bold mb-6 leading-[1.05]" style={{ fontFamily: "'Clash Display', sans-serif" }}>
                START YOUR<br /><span className="text-primary">PROJECT</span>
              </h1>
              <p className="text-base text-muted-foreground mb-8">
                Tell us about your project and we'll connect you with certified ICF contractors who can bring your vision to life.
              </p>
              <div className="space-y-4 hidden lg:block">
                {["Connect with local experts", "Matched with certified pros", "Response within 24-48 hours", "Compare multiple contractors"].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    <div className="w-5 h-5 bg-primary/10 rounded-sm flex items-center justify-center">
                      <Check className="w-3 h-3 text-primary" />
                    </div>
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="col-span-12 lg:col-span-8">
              <form onSubmit={handleSubmit} data-testid="quote-form" className="bg-card border border-border rounded-sm p-8 relative tech-corner">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label className="mono-label mb-2 block">FULL NAME *</Label>
                    <Input
                      data-testid="quote-name-input"
                      value={form.name}
                      onChange={e => update("name", e.target.value)}
                      placeholder="John Smith"
                      className="rounded-sm bg-muted/50 border-border focus:border-primary"
                    />
                  </div>
                  <div>
                    <Label className="mono-label mb-2 block">EMAIL *</Label>
                    <Input
                      data-testid="quote-email-input"
                      type="email"
                      value={form.email}
                      onChange={e => update("email", e.target.value)}
                      placeholder="john@example.com"
                      className="rounded-sm bg-muted/50 border-border"
                    />
                  </div>
                  <div>
                    <Label className="mono-label mb-2 block">PHONE *</Label>
                    <Input
                      data-testid="quote-phone-input"
                      value={form.phone}
                      onChange={e => update("phone", e.target.value)}
                      placeholder="(555) 123-4567"
                      className="rounded-sm bg-muted/50 border-border"
                    />
                  </div>
                  <div>
                    <Label className="mono-label mb-2 block">CITY</Label>
                    <Input
                      data-testid="quote-city-input"
                      value={form.city}
                      onChange={e => update("city", e.target.value)}
                      placeholder="Austin"
                      className="rounded-sm bg-muted/50 border-border"
                    />
                  </div>
                  <div>
                    <Label className="mono-label mb-2 block">STATE</Label>
                    <Input
                      data-testid="quote-state-input"
                      value={form.state}
                      onChange={e => update("state", e.target.value)}
                      placeholder="TX"
                      className="rounded-sm bg-muted/50 border-border"
                    />
                  </div>
                  <div>
                    <Label className="mono-label mb-2 block">PROJECT TYPE *</Label>
                    <Select onValueChange={v => update("project_type", v)}>
                      <SelectTrigger data-testid="quote-project-type" className="rounded-sm bg-muted/50 border-border">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new_home">New Home Construction</SelectItem>
                        <SelectItem value="addition">Home Addition</SelectItem>
                        <SelectItem value="basement">Basement</SelectItem>
                        <SelectItem value="commercial">Commercial Building</SelectItem>
                        <SelectItem value="foundation">Foundation Only</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="mono-label mb-2 block">PROJECT SIZE</Label>
                    <Select onValueChange={v => update("project_size", v)}>
                      <SelectTrigger data-testid="quote-project-size" className="rounded-sm bg-muted/50 border-border">
                        <SelectValue placeholder="Square footage" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="under_1500">Under 1,500 sq ft</SelectItem>
                        <SelectItem value="1500_2500">1,500 - 2,500 sq ft</SelectItem>
                        <SelectItem value="2500_4000">2,500 - 4,000 sq ft</SelectItem>
                        <SelectItem value="4000_6000">4,000 - 6,000 sq ft</SelectItem>
                        <SelectItem value="over_6000">Over 6,000 sq ft</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="mono-label mb-2 block">BUDGET RANGE</Label>
                    <Select onValueChange={v => update("budget_range", v)}>
                      <SelectTrigger data-testid="quote-budget" className="rounded-sm bg-muted/50 border-border">
                        <SelectValue placeholder="Select budget" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="under_200k">Under $200,000</SelectItem>
                        <SelectItem value="200k_400k">$200,000 - $400,000</SelectItem>
                        <SelectItem value="400k_700k">$400,000 - $700,000</SelectItem>
                        <SelectItem value="700k_1m">$700,000 - $1,000,000</SelectItem>
                        <SelectItem value="over_1m">Over $1,000,000</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="mono-label mb-2 block">TIMELINE</Label>
                    <Select onValueChange={v => update("timeline", v)}>
                      <SelectTrigger data-testid="quote-timeline" className="rounded-sm bg-muted/50 border-border">
                        <SelectValue placeholder="When to start" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="asap">As soon as possible</SelectItem>
                        <SelectItem value="1_3_months">1-3 months</SelectItem>
                        <SelectItem value="3_6_months">3-6 months</SelectItem>
                        <SelectItem value="6_12_months">6-12 months</SelectItem>
                        <SelectItem value="just_exploring">Just exploring</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="mt-6">
                  <Label className="mono-label mb-2 block">PROJECT DESCRIPTION</Label>
                  <Textarea
                    data-testid="quote-description"
                    value={form.description}
                    onChange={e => update("description", e.target.value)}
                    placeholder="Tell us about your project — style, features, specific requirements, questions..."
                    rows={4}
                    className="rounded-sm bg-muted/50 border-border"
                  />
                </div>

                <Button
                  data-testid="quote-submit-btn"
                  type="submit"
                  disabled={loading}
                  className="w-full mt-8 rounded-sm text-xs tracking-widest font-bold uppercase py-3 hard-shadow"
                  size="lg"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  SUBMIT PROJECT BRIEF <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
