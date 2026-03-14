import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, FileUp, Loader2, Play, Ruler, ScanLine, Sparkles, Building2, Lock } from "lucide-react";
import Takeoff3DViewer from "@/components/Takeoff3DViewer";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function TakeoffEstimator() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [token] = useState(() => localStorage.getItem("icf_token"));
  const [authLoading, setAuthLoading] = useState(true);
  const [contractorProfile, setContractorProfile] = useState(null);

  const [file, setFile] = useState(null);
  const [wallHeight, setWallHeight] = useState("10");

  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [error, setError] = useState("");

  const [analysis, setAnalysis] = useState(null);

  useEffect(() => {
    const verifyContractor = async () => {
      if (!token) {
        setAuthLoading(false);
        return;
      }

      try {
        const requestOptions = {
          headers: {
            Authorization: `Bearer ${token}`
          }
        };

        const primaryBase = (BACKEND_URL || "").replace(/\/$/, "");
        let response = await fetch(`${primaryBase}/api/contractors/me/profile`, requestOptions);

        if (response.status === 404) {
          response = await fetch(`/api/contractors/me/profile`, requestOptions);
        }

        if (!response.ok) {
          throw new Error("Contractor access required");
        }

        const profile = await response.json();
        setContractorProfile(profile);
      } catch (e) {
        setContractorProfile(null);
      } finally {
        setAuthLoading(false);
      }
    };

    verifyContractor();
  }, [token]);

  const summary = useMemo(() => analysis?.summary || null, [analysis]);
  const walls = useMemo(() => analysis?.walls || [], [analysis]);
  const model3d = useMemo(() => analysis?.model_3d || null, [analysis]);

  const averageWallHeight = useMemo(() => {
    if (!walls.length) return summary?.ceiling_height_ft || 0;
    const total = walls.reduce((acc, wall) => acc + (Number(wall.height_ft) || 0), 0);
    return Number((total / walls.length).toFixed(2));
  }, [walls, summary]);

  const handleFileUpload = (event) => {
    const uploadedFile = event.target.files?.[0];
    if (!uploadedFile) return;

    const isPdf = uploadedFile.type === "application/pdf" || uploadedFile.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      setError("Takeoff Beta currently supports PDF floor plans only.");
      setFile(null);
      return;
    }

    setError("");
    setFile(uploadedFile);
  };

  const handleStartTakeoff = async () => {
    if (!file) {
      setError("Please upload a PDF floor plan first.");
      return;
    }

    if (!token || !contractorProfile) {
      setError("Contractor sign-in is required to run Takeoff Beta.");
      return;
    }

    setError("");
    setLoading(true);
    setLoadingMessage("Uploading floor plan PDF...");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("format", "pdf");
    formData.append("wall_height", wallHeight || "10");

    try {
      const phaseTimer = setTimeout(() => setLoadingMessage("Parsing walls, openings, and generating 3D wall layout..."), 700);

      const requestOptions = {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      };

      const primaryBase = (BACKEND_URL || "").replace(/\/$/, "");
      let response = await fetch(`${primaryBase}/api/takeoff/analyze`, requestOptions);

      if (response.status === 404) {
        const fallbackFormData = new FormData();
        fallbackFormData.append("file", file);
        fallbackFormData.append("format", "pdf");
        fallbackFormData.append("wall_height", wallHeight || "10");

        response = await fetch(`/api/takeoff/analyze`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: fallbackFormData
        });
      }

      clearTimeout(phaseTimer);

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || "Takeoff analysis failed.");
      }

      const data = await response.json();
      setAnalysis(data);
      setLoadingMessage("Takeoff complete.");
    } catch (err) {
      setError(err.message || "Could not analyze this floor plan.");
    } finally {
      setLoading(false);
      setTimeout(() => setLoadingMessage(""), 600);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          Checking contractor access...
        </div>
      </div>
    );
  }

  if (!contractorProfile) {
    return (
      <div className="min-h-screen bg-background px-6 py-20">
        <div className="max-w-3xl mx-auto border border-border rounded-xl bg-card p-8 text-center shadow-sm">
          <div className="mx-auto w-12 h-12 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center mb-4">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Takeoff Beta is Contractor Only</h1>
          <p className="text-muted-foreground mb-6">
            Sign in as a contractor to upload PDF floor plans and generate AI wall takeoffs with 3D wall layout.
          </p>
          <button
            onClick={() => navigate("/auth")}
            className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Sign In as Contractor
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/30 to-background px-6 py-24">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="text-xs uppercase tracking-[0.2em] text-orange-500 font-semibold">Tools / ICF Takeoff</span>
                <span className="bg-orange-500/10 text-orange-600 border border-orange-500/30 px-2 py-0.5 text-[11px] font-bold rounded">BETA</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">AI TAKEOFF BETA</h1>
              <p className="text-muted-foreground">
                Upload a floor plan PDF to parse walls, openings, net wall sqft, ceiling heights, and a 3D wall layout.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card p-6 space-y-5">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">ICF Format</label>
                  <input
                    value="PDF Plan Parsing"
                    disabled
                    className="w-full rounded-md border border-input bg-muted px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Default Ceiling Height (ft)</label>
                  <input
                    type="number"
                    min="8"
                    max="24"
                    value={wallHeight}
                    onChange={(e) => setWallHeight(e.target.value)}
                    className="w-full rounded-md border border-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Upload floor plan (PDF only)</label>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-orange-300 hover:border-orange-400 rounded-lg p-6 text-left transition bg-orange-50/40"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-md bg-orange-500 text-white flex items-center justify-center">
                      <FileUp className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-semibold">{file ? file.name : "Choose a PDF floor plan"}</p>
                      <p className="text-sm text-muted-foreground">PDF upload only • Recommended: clear first-floor layout</p>
                    </div>
                  </div>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              {error && (
                <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700 flex gap-2 items-start">
                  <AlertTriangle className="w-4 h-4 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="button"
                onClick={handleStartTakeoff}
                disabled={loading || !file}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                {loading ? "Running AI Takeoff..." : "Start Automatic Takeoff"}
              </button>

              {loadingMessage && <p className="text-sm text-muted-foreground">{loadingMessage}</p>}
            </div>

            {summary && (
              <>
                <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  <MetricCard icon={Ruler} label="Total Linear Feet" value={`${summary.total_linear_feet} ft`} />
                  <MetricCard icon={Building2} label="Net Wall Sqft (minus openings)" value={`${summary.net_wall_sqft} sqft`} />
                  <MetricCard icon={ScanLine} label="Openings" value={`${summary.opening_count}`} />
                  <MetricCard icon={Sparkles} label="Openings Sqft" value={`${summary.openings_sqft} sqft`} />
                  <MetricCard icon={Building2} label="Gross Wall Sqft" value={`${summary.gross_wall_sqft} sqft`} />
                  <MetricCard icon={Ruler} label="Ceiling Heights" value={`${summary.ceiling_height_ft} ft avg`} />
                </div>

                <div className="rounded-xl border border-border bg-card p-6">
                  <h2 className="text-lg font-semibold mb-3">3D Wall Layout</h2>
                  <Takeoff3DViewer model3d={model3d} />
                  <p className="text-xs text-muted-foreground mt-3">
                    Approximate model based on detected wall geometry from uploaded floor plan.
                  </p>
                </div>

                <div className="rounded-xl border border-border bg-card p-6 overflow-x-auto">
                  <h2 className="text-lg font-semibold mb-4">Parsed Walls</h2>
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-muted-foreground border-b border-border">
                        <th className="py-2 pr-4">Wall</th>
                        <th className="py-2 pr-4">Linear ft</th>
                        <th className="py-2 pr-4">Height ft</th>
                        <th className="py-2 pr-4">Gross sqft</th>
                        <th className="py-2 pr-4">Openings</th>
                        <th className="py-2 pr-4">Net sqft</th>
                      </tr>
                    </thead>
                    <tbody>
                      {walls.map((wall) => (
                        <tr key={wall.id} className="border-b border-border/60">
                          <td className="py-2 pr-4 font-medium">{wall.id}</td>
                          <td className="py-2 pr-4">{wall.linear_feet}</td>
                          <td className="py-2 pr-4">{wall.height_ft}</td>
                          <td className="py-2 pr-4">{wall.sqft}</td>
                          <td className="py-2 pr-4">{wall.openings_count}</td>
                          <td className="py-2 pr-4">{wall.net_sqft}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

          <div className="space-y-6">
            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Beta Status</h3>
              <div className="space-y-3 text-sm">
                <StatusRow label="Version" value="0.2-beta" />
                <StatusRow label="Access" value="Contractor Only" />
                <StatusRow label="Input" value="PDF Floor Plans" />
                <StatusRow label="Output" value="Walls + Openings + 3D" />
                <StatusRow label="Contractor" value={contractorProfile?.company_name || contractorProfile?.email || "Verified"} />
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
              <p className="font-semibold text-foreground mb-2">What this beta returns</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Total linear wall feet</li>
                <li>Gross sqft and net sqft after openings</li>
                <li>Opening count and opening area</li>
                <li>Ceiling height assumptions</li>
                <li>Interactive 3D wall layout</li>
              </ul>
            </div>

            {summary && (
              <div className="rounded-xl border border-orange-300 bg-orange-50 p-6">
                <p className="text-xs uppercase tracking-wide text-orange-600 font-semibold">Takeoff Snapshot</p>
                <p className="text-2xl font-bold text-orange-700 mt-1">{summary.total_linear_feet} ft</p>
                <p className="text-sm text-orange-700">Total linear wall length</p>
                <div className="mt-3 text-sm text-orange-800">
                  Avg wall height detected: <span className="font-semibold">{averageWallHeight} ft</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wide mb-2">
        <Icon className="w-4 h-4" />
        <span>{label}</span>
      </div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}

function StatusRow({ label, value }) {
  return (
    <div className="flex items-center justify-between border-b border-border/60 pb-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold text-foreground">{value}</span>
    </div>
  );
}
