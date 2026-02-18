import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, Zap, Sparkles, Bell, Settings } from "lucide-react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [unread, setUnread] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();
  const token = localStorage.getItem("icf_token");

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => { setIsOpen(false); }, [location]);

  useEffect(() => {
    if (token) {
      axios.get(`${API}/notifications/unread-count`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(r => setUnread(r.data.count)).catch(() => {});
    }
  }, [token, location]);

  const navLinks = token ? [
    { to: "/dashboard", label: "DASHBOARD" },
    { to: "/content", label: "AI CONTENT" },
    { to: "/campaigns", label: "CAMPAIGNS" },
    { to: "/calendar", label: "CALENDAR" },
    { to: "/pricing", label: "UPGRADE" }, // Added Upgrade link for logged in users
  ] : [
    { to: "/about-icf", label: "WHY ICF" },
    { to: "/contractors", label: "CONTRACTORS" },
    { to: "/pricing", label: "PRICING" },
    { to: "/get-quote", label: "START PROJECT" },
  ];

  return (
    <nav
      data-testid="main-navbar"
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "glass shadow-sm" : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" data-testid="nav-logo" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-sm flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight" style={{ fontFamily: "'Clash Display', sans-serif" }}>
              ICF HUB
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                data-testid={`nav-${link.label.toLowerCase().replace(/\s/g, "-")}`}
                className={`text-xs font-semibold tracking-widest transition-colors hover:text-primary ${
                  location.pathname === link.to ? "text-primary" : "text-foreground/70"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            {token ? (
              <>
                <button
                  data-testid="nav-social-btn"
                  onClick={() => navigate("/social")}
                  className="p-2 hover:bg-muted rounded-sm transition-colors"
                  title="Connected Accounts"
                >
                  <Settings className="w-4 h-4" />
                </button>
                <button
                  data-testid="nav-notifications-btn"
                  onClick={() => navigate("/dashboard")}
                  className="relative p-2 hover:bg-muted rounded-sm transition-colors"
                >
                  <Bell className="w-4 h-4" />
                  {unread > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary text-primary-foreground text-[9px] font-bold rounded-full flex items-center justify-center">
                      {unread > 9 ? "9+" : unread}
                    </span>
                  )}
                </button>
                <Button
                  data-testid="nav-dashboard-btn"
                  onClick={() => navigate("/dashboard")}
                  className="rounded-sm text-xs tracking-widest font-bold uppercase px-5 py-2 hard-shadow"
                >
                  DASHBOARD
                </Button>
              </>
            ) : (
              <>
                <Button
                  data-testid="nav-login-btn"
                  variant="ghost"
                  onClick={() => navigate("/auth")}
                  className="text-xs tracking-widest font-semibold"
                >
                  SIGN IN
                </Button>
                <Button
                  data-testid="nav-register-btn"
                  variant="outline"
                  onClick={() => navigate("/auth?mode=register")}
                  className="rounded-sm text-xs tracking-widest font-bold uppercase px-5 py-2"
                >
                  REGISTER
                </Button>
                <Button
                  data-testid="nav-get-started-btn"
                  onClick={() => navigate("/get-quote")}
                  className="rounded-sm text-xs tracking-widest font-bold uppercase px-5 py-2 hard-shadow"
                >
                  START PROJECT
                </Button>
              </>
            )}
          </div>

          <button
            data-testid="nav-mobile-toggle"
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2"
          >
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {isOpen && (
        <div data-testid="nav-mobile-menu" className="md:hidden glass border-t border-border">
          <div className="px-6 py-4 space-y-3">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="block text-sm font-semibold tracking-wider py-2"
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-3 border-t border-border flex gap-3">
              {token ? (
                <Button onClick={() => navigate("/dashboard")} className="w-full rounded-sm text-xs tracking-widest font-bold uppercase">
                  DASHBOARD
                </Button>
              ) : (
                <>
                  <Button variant="outline" onClick={() => navigate("/auth")} className="flex-1 rounded-sm text-xs tracking-widest">
                    SIGN IN
                  </Button>
                  <Button onClick={() => navigate("/get-quote")} className="flex-1 rounded-sm text-xs tracking-widest">
                    START PROJECT
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
