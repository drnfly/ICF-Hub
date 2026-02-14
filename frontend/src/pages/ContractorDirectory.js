import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, MapPin, Clock, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ContractorDirectory() {
  const navigate = useNavigate();
  const [contractors, setContractors] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/contractors`)
      .then(r => setContractors(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = contractors.filter(c =>
    c.company_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.city?.toLowerCase().includes(search.toLowerCase()) ||
    c.state?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="pt-16">
      <section className="py-20 noise-bg blueprint-grid">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="mb-12">
            <span className="mono-label mb-3 block">DIRECTORY</span>
            <h1 className="text-4xl sm:text-5xl font-bold mb-4" style={{ fontFamily: "'Clash Display', sans-serif" }}>
              Find <span className="text-primary">ICF Contractors</span>
            </h1>
            <p className="text-base text-muted-foreground max-w-lg">
              Connect with certified ICF construction professionals in your area.
            </p>
          </div>

          <div className="relative max-w-md mb-12">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              data-testid="contractor-search-input"
              placeholder="Search by name, city, or state..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10 rounded-sm bg-card border-border"
            />
          </div>

          {loading ? (
            <div className="text-center py-20">
              <div className="mono-label">LOADING CONTRACTORS...</div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 bg-card border border-dashed border-border rounded-sm">
              <h3 className="text-lg font-bold mb-2" style={{ fontFamily: "'Clash Display', sans-serif" }}>
                {contractors.length === 0 ? "No Contractors Yet" : "No Results Found"}
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                {contractors.length === 0
                  ? "Be the first contractor to join our platform."
                  : "Try adjusting your search terms."}
              </p>
              {contractors.length === 0 && (
                <Button
                  data-testid="directory-join-btn"
                  onClick={() => navigate("/auth")}
                  className="rounded-sm text-xs tracking-widest font-bold uppercase px-6 py-3"
                >
                  JOIN AS CONTRACTOR
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((c, i) => (
                <div
                  key={c.id || i}
                  data-testid={`contractor-card-${i}`}
                  className="bg-card border border-border rounded-sm p-6 relative tech-corner hover:border-primary/30 transition-all hover:scale-[1.01]"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-sm flex items-center justify-center text-primary font-bold text-lg">
                      {c.company_name?.[0] || "C"}
                    </div>
                    {c.plan !== "free" && (
                      <Badge variant="outline" className="text-primary border-primary/30 text-[10px] tracking-wider uppercase">
                        VERIFIED
                      </Badge>
                    )}
                  </div>

                  <h3 className="text-base font-bold mb-2" style={{ fontFamily: "'Clash Display', sans-serif" }}>
                    {c.company_name}
                  </h3>

                  {(c.city || c.state) && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                      <MapPin className="w-3 h-3" />
                      <span>{[c.city, c.state].filter(Boolean).join(", ")}</span>
                    </div>
                  )}

                  {c.years_experience > 0 && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
                      <Clock className="w-3 h-3" />
                      <span>{c.years_experience} years experience</span>
                    </div>
                  )}

                  {c.description && (
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{c.description}</p>
                  )}

                  {c.specialties?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {c.specialties.slice(0, 3).map((s, j) => (
                        <Badge key={j} variant="secondary" className="text-[10px] tracking-wider uppercase rounded-sm">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <Button
                    data-testid={`contractor-contact-btn-${i}`}
                    variant="outline"
                    onClick={() => navigate("/get-quote")}
                    className="w-full rounded-sm text-xs tracking-widest font-bold uppercase mt-2"
                  >
                    REQUEST QUOTE <ArrowRight className="w-3 h-3 ml-2" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
