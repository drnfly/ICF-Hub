import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Loader2, Zap, Shield, Crown } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Pricing() {
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Please login first");
        window.location.href = "/auth";
        return;
      }

      // Origin URL for success/cancel redirects
      const originUrl = window.location.origin;

      const res = await axios.post(
        `${API}/payments/checkout`,
        { plan_id: "pro_monthly", origin_url: originUrl },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.url) {
        window.location.href = res.data.url;
      } else {
        toast.error("Failed to start checkout");
      }
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pt-24 min-h-screen bg-secondary/30">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="mono-label mb-3 block">UPGRADE YOUR BUSINESS</span>
          <h1 className="text-4xl sm:text-5xl font-bold mb-6" style={{ fontFamily: "'Clash Display', sans-serif" }}>
            Simple, Transparent <span className="text-primary">Pricing</span>
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Choose the plan that fits your growth. Cancel anytime.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Free Plan */}
          <div className="bg-card border border-border rounded-sm p-8 relative">
            <div className="mb-8">
              <h3 className="text-xl font-bold mb-2">Starter</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold">$0</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                Perfect for getting started with ICF Hub.
              </p>
            </div>
            <div className="space-y-4 mb-8">
              {["Basic Profile Listing", "Receive Leads (Limited)", "3 AI Content Generations/mo", "Community Access"].map((feat, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <Check className="w-4 h-4 text-muted-foreground" />
                  <span>{feat}</span>
                </div>
              ))}
            </div>
            <Button variant="outline" className="w-full" disabled>
              CURRENT PLAN
            </Button>
          </div>

          {/* Pro Plan */}
          <div className="bg-card border-2 border-primary rounded-sm p-8 relative shadow-2xl overflow-hidden">
            <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-bl-sm">
              MOST POPULAR
            </div>
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-xl font-bold">Pro Contractor</h3>
                <Crown className="w-5 h-5 text-primary fill-primary/20" />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold">$49</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                Unlock full power to grow your business faster.
              </p>
            </div>
            <div className="space-y-4 mb-8">
              {[
                "Priority Lead Access (Instant)",
                "Unlimited AI Content Generation",
                "Verified Contractor Badge",
                "Advanced Analytics Dashboard",
                "Premium Support"
              ].map((feat, i) => (
                <div key={i} className="flex items-center gap-3 text-sm font-medium">
                  <div className="w-5 h-5 bg-primary/10 rounded-full flex items-center justify-center">
                    <Check className="w-3 h-3 text-primary" />
                  </div>
                  <span>{feat}</span>
                </div>
              ))}
            </div>
            <Button 
              onClick={handleUpgrade} 
              disabled={loading}
              className="w-full py-6 text-base font-bold tracking-wide"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Zap className="w-5 h-5 mr-2" />}
              UPGRADE TO PRO
            </Button>
            <p className="text-xs text-center text-muted-foreground mt-4">
              Secure payment via Stripe. 14-day money-back guarantee.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
