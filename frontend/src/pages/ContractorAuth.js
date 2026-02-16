import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, ArrowRight } from "lucide-react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ContractorAuth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLogin, setIsLogin] = useState(searchParams.get("mode") !== "register");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    company_name: "", email: "", password: "", phone: "", city: "", state: "",
    description: "", years_experience: 0, specialties: []
  });

  const update = (key, val) => setForm(p => ({ ...p, [key]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      toast.error("Email and password are required");
      return;
    }
    if (!isLogin && !form.company_name) {
      toast.error("Company name is required");
      return;
    }

    setLoading(true);
    try {
      const endpoint = isLogin ? "/auth/login" : "/auth/register";
      const payload = isLogin
        ? { email: form.email, password: form.password }
        : { ...form, years_experience: parseInt(form.years_experience) || 0, specialties: form.specialties.length ? form.specialties : [] };

      const { data } = await axios.post(`${API}${endpoint}`, payload);
      localStorage.setItem("icf_token", data.token);
      localStorage.setItem("icf_contractor", JSON.stringify(data.contractor));
      toast.success(isLogin ? "Welcome back!" : "Account created successfully!");
      navigate("/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pt-16 min-h-screen noise-bg blueprint-grid flex items-center justify-center py-20">
      <div className="w-full max-w-md px-6">
        <div className="mb-8 text-center">
          <span className="mono-label mb-3 block">CONTRACTOR PORTAL</span>
          <h1 className="text-3xl sm:text-4xl font-bold" style={{ fontFamily: "'Clash Display', sans-serif" }}>
            {isLogin ? "Welcome Back" : "Join"} <span className="text-primary">ICF Hub</span>
          </h1>
        </div>

        <form onSubmit={handleSubmit} data-testid="auth-form" className="bg-card border border-border rounded-sm p-8 relative tech-corner">
          {!isLogin && (
            <div className="mb-4">
              <Label className="mono-label mb-2 block">COMPANY NAME *</Label>
              <Input
                data-testid="auth-company-input"
                value={form.company_name}
                onChange={e => update("company_name", e.target.value)}
                placeholder="ABC Construction"
                className="rounded-sm bg-muted/50 border-border"
              />
            </div>
          )}

          <div className="mb-4">
            <Label className="mono-label mb-2 block">EMAIL *</Label>
            <Input
              data-testid="auth-email-input"
              type="email"
              value={form.email}
              onChange={e => update("email", e.target.value)}
              placeholder="contractor@company.com"
              className="rounded-sm bg-muted/50 border-border"
            />
          </div>

          <div className="mb-4">
            <Label className="mono-label mb-2 block">PASSWORD *</Label>
            <Input
              data-testid="auth-password-input"
              type="password"
              value={form.password}
              onChange={e => update("password", e.target.value)}
              placeholder="Min 6 characters"
              className="rounded-sm bg-muted/50 border-border"
            />
          </div>

          {!isLogin && (
            <>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <Label className="mono-label mb-2 block">PHONE</Label>
                  <Input
                    data-testid="auth-phone-input"
                    value={form.phone}
                    onChange={e => update("phone", e.target.value)}
                    placeholder="(555) 123-4567"
                    className="rounded-sm bg-muted/50 border-border"
                  />
                </div>
                <div>
                  <Label className="mono-label mb-2 block">YEARS EXP</Label>
                  <Input
                    data-testid="auth-experience-input"
                    type="number"
                    value={form.years_experience}
                    onChange={e => update("years_experience", e.target.value)}
                    className="rounded-sm bg-muted/50 border-border"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <Label className="mono-label mb-2 block">CITY</Label>
                  <Input
                    data-testid="auth-city-input"
                    value={form.city}
                    onChange={e => update("city", e.target.value)}
                    placeholder="Austin"
                    className="rounded-sm bg-muted/50 border-border"
                  />
                </div>
                <div>
                  <Label className="mono-label mb-2 block">STATE</Label>
                  <Input
                    data-testid="auth-state-input"
                    value={form.state}
                    onChange={e => update("state", e.target.value)}
                    placeholder="TX"
                    className="rounded-sm bg-muted/50 border-border"
                  />
                </div>
              </div>
            </>
          )}

          <Button
            data-testid="auth-submit-btn"
            type="submit"
            disabled={loading}
            className="w-full rounded-sm text-xs tracking-widest font-bold uppercase py-3 hard-shadow mt-2"
            size="lg"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            {isLogin ? "SIGN IN" : "CREATE ACCOUNT"} <ArrowRight className="w-4 h-4 ml-2" />
          </Button>

          <div className="mt-6 text-center">
            <button
              type="button"
              data-testid="auth-toggle-btn"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <span className="font-semibold text-primary">{isLogin ? "Register" : "Sign In"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
