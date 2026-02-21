import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Check, Zap, Calendar, Clock } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function HomeownerUpgrade({ open, onOpenChange }) {
  const [loading, setLoading] = useState(false);

  const handleCheckout = async (planId) => {
    setLoading(true);
    try {
      // In a real app, we'd register the user first or capture email here.
      // For this demo, we'll assume a "guest checkout" or redirect to a register+pay flow.
      // We'll use the existing checkout endpoint but would need a new one for homeowners in production.
      const endpoint = planId.startsWith('homeowner') ? '/payments/public/checkout' : '/payments/checkout';
      const headers = planId.startsWith('homeowner') ? {} : { Authorization: `Bearer ${localStorage.getItem('token')}` };

      const res = await axios.post(`${API}${endpoint}`, {
        plan_id: planId,
        origin_url: window.location.origin
      }, { headers });
      
      window.location.href = res.data.url;
    } catch (err) {
      toast.error("Checkout failed. (Backend needs homeowner update)");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader className="text-center">
          <DialogTitle className="text-3xl font-bold mb-2" style={{ fontFamily: "'Clash Display', sans-serif" }}>
            Unlock Expert <span className="text-primary">Advice</span>
          </DialogTitle>
          <DialogDescription className="text-lg">
            Get unlimited AI answers, plan reviews, and specific build guidance.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {/* Monthly Option */}
          <div className="border border-border rounded-lg p-6 hover:border-primary/50 transition-all cursor-pointer relative bg-card">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-secondary text-secondary-foreground text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
              Best for Planning
            </div>
            <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" /> Monthly Access
            </h3>
            <div className="flex items-baseline gap-1 mb-4">
              <span className="text-3xl font-bold">$19</span>
              <span className="text-muted-foreground">/mo</span>
            </div>
            <ul className="space-y-3 mb-6 text-sm">
              <li className="flex gap-2"><Check className="w-4 h-4 text-primary" /> Unlimited AI Questions</li>
              <li className="flex gap-2"><Check className="w-4 h-4 text-primary" /> Plan & Photo Uploads</li>
              <li className="flex gap-2"><Check className="w-4 h-4 text-primary" /> Detailed Site Analysis</li>
            </ul>
            <Button className="w-full" onClick={() => handleCheckout('homeowner_monthly')}>
              Subscribe Now
            </Button>
          </div>

          {/* Project Pass Option */}
          <div className="border-2 border-primary rounded-lg p-6 relative bg-primary/5">
             <div className="absolute -top-3 right-4 bg-primary text-primary-foreground text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
              One-Time Payment
            </div>
            <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" /> Project Pass
            </h3>
            <div className="flex items-baseline gap-1 mb-4">
              <span className="text-3xl font-bold">$49</span>
              <span className="text-muted-foreground">/30 days</span>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Perfect for getting quick answers during a specific project phase. No recurring billing.
            </p>
            <ul className="space-y-3 mb-6 text-sm">
              <li className="flex gap-2"><Check className="w-4 h-4 text-primary" /> All Pro Features</li>
              <li className="flex gap-2"><Check className="w-4 h-4 text-primary" /> No Auto-Renewal</li>
            </ul>
            <Button className="w-full" onClick={() => handleCheckout('homeowner_pass')}>
              Get 30-Day Pass
            </Button>
          </div>
        </div>
        
        <p className="text-center text-xs text-muted-foreground mt-4">
          Contractor matching is always free.
        </p>
      </DialogContent>
    </Dialog>
  );
}
