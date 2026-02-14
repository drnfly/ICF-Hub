import { Link } from "react-router-dom";
import { Zap } from "lucide-react";

export default function Footer() {
  return (
    <footer data-testid="main-footer" className="bg-secondary text-secondary-foreground">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12">
          <div className="md:col-span-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-primary rounded-sm flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold tracking-tight" style={{ fontFamily: "'Clash Display', sans-serif" }}>
                ICF HUB
              </span>
            </div>
            <p className="text-sm text-secondary-foreground/60 leading-relaxed max-w-xs">
              Connecting homeowners with certified ICF contractors. 
              Build stronger, smarter, and more energy-efficient.
            </p>
          </div>

          <div className="md:col-span-2">
            <span className="mono-label text-secondary-foreground/40 block mb-4">Platform</span>
            <div className="space-y-3">
              <Link to="/about-icf" className="block text-sm text-secondary-foreground/70 hover:text-primary transition-colors">Why ICF</Link>
              <Link to="/contractors" className="block text-sm text-secondary-foreground/70 hover:text-primary transition-colors">Contractors</Link>
              <Link to="/get-quote" className="block text-sm text-secondary-foreground/70 hover:text-primary transition-colors">Get a Quote</Link>
              <Link to="/pricing" className="block text-sm text-secondary-foreground/70 hover:text-primary transition-colors">Pricing</Link>
            </div>
          </div>

          <div className="md:col-span-3">
            <span className="mono-label text-secondary-foreground/40 block mb-4">ICF Resources</span>
            <div className="space-y-3">
              <Link to="/about-icf" className="block text-sm text-secondary-foreground/70 hover:text-primary transition-colors">ICF Benefits</Link>
              <Link to="/about-icf" className="block text-sm text-secondary-foreground/70 hover:text-primary transition-colors">Cost Calculator</Link>
              <Link to="/about-icf" className="block text-sm text-secondary-foreground/70 hover:text-primary transition-colors">Energy Savings</Link>
              <Link to="/about-icf" className="block text-sm text-secondary-foreground/70 hover:text-primary transition-colors">FAQ</Link>
            </div>
          </div>

          <div className="md:col-span-3">
            <span className="mono-label text-secondary-foreground/40 block mb-4">For Contractors</span>
            <div className="space-y-3">
              <Link to="/auth" className="block text-sm text-secondary-foreground/70 hover:text-primary transition-colors">Join as Contractor</Link>
              <Link to="/pricing" className="block text-sm text-secondary-foreground/70 hover:text-primary transition-colors">Subscription Plans</Link>
              <Link to="/dashboard" className="block text-sm text-secondary-foreground/70 hover:text-primary transition-colors">Dashboard</Link>
            </div>
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-secondary-foreground/10 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-secondary-foreground/40">
            2025 ICF Hub. All rights reserved.
          </p>
          <p className="text-xs text-secondary-foreground/40">
            Built for the future of construction.
          </p>
        </div>
      </div>
    </footer>
  );
}
