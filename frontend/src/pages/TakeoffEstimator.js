import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Loader2, ArrowUpRight, ArrowRight, Ruler, Building2, ScanLine, Sparkles } from "lucide-react";
import Takeoff3DViewer from "@/components/Takeoff3DViewer";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const BLOCK_OPTIONS = ["Nudura", "Fox Blocks", "Amvic", "BuildBlock", "Logix"];
const CORE_OPTIONS = ["4 in", "6 in", "8 in", "10 in", "12 in"];

export default function TakeoffEstimator() {
  const [token] = useState(() => localStorage.getItem("icf_token"));
  const [profileLabel, setProfileLabel] = useState("Guest");

  const [projectName, setProjectName] = useState("");
  const [blockMfg, setBlockMfg] = useState(BLOCK_OPTIONS[0]);
  const [coreSize, setCoreSize] = useState(CORE_OPTIONS[1]);

  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [error, setError] = useState("");
  const [analysis, setAnalysis] = useState(null);

  useEffect(() => {
    const loadProfile = async () => {
      if (!token) {
        setProfileLabel("Guest");
        return;
      }

      try {
        const primaryBase = (BACKEND_URL || "").replace(/\/$/, "");
        let response = await fetch(`${primaryBase}/api/contractors/me/profile`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (response.status === 404) {
          response = await fetch(`/api/contractors/me/profile`, {
            headers: { Authorization: `Bearer ${token}` }
          });
        }

        if (!response.ok) {
          setProfileLabel("Signed In");
          return;
        }

        const profile = await response.json();
        setProfileLabel(profile?.company_name || profile?.email || "Signed In");
      } catch {
        setProfileLabel("Signed In");
      }
    };

    loadProfile();
  }, [token]);

  const summary = useMemo(() => analysis?.summary || null, [analysis]);
  const walls = useMemo(() => analysis?.walls || [], [analysis]);
  const model3d = useMemo(() => analysis?.model_3d || null, [analysis]);

  const handleFileUpload = (event) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    const isPdf = selectedFile.type === "application/pdf" || selectedFile.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      setError("Please upload a PDF floor plan.");
      setFile(null);
      return;
    }

    setError("");
    setFile(selectedFile);
  };

  const handleStartTakeoff = async () => {
    if (!file) {
      setError("Upload plans before starting automatic takeoff.");
      return;
    }

    setError("");
    setLoading(true);
    setLoadingMessage("Uploading plans...");

    const requestHeaders = token ? { Authorization: `Bearer ${token}` } : {};

    const formData = new FormData();
    formData.append("file", file);
    formData.append("format", "pdf");
    formData.append("project_name", projectName || "Untitled Project");
    formData.append("block_mfg", blockMfg);
    formData.append("core_size", coreSize);

    try {
      const phaseTimer = setTimeout(() => {
        setLoadingMessage("Parsing walls, openings, and generating 3D wall layout...");
      }, 600);

      const primaryBase = (BACKEND_URL || "").replace(/\/$/, "");
      let response = await fetch(`${primaryBase}/api/takeoff/analyze`, {
        method: "POST",
        headers: requestHeaders,
        body: formData
      });

      if (response.status === 404) {
        const fallbackFormData = new FormData();
        fallbackFormData.append("file", file);
        fallbackFormData.append("format", "pdf");
        fallbackFormData.append("project_name", projectName || "Untitled Project");
        fallbackFormData.append("block_mfg", blockMfg);
        fallbackFormData.append("core_size", coreSize);

        response = await fetch(`/api/takeoff/analyze`, {
          method: "POST",
          headers: requestHeaders,
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
      setError(err.message || "Could not run takeoff.");
    } finally {
      setLoading(false);
      setTimeout(() => setLoadingMessage(""), 700);
    }
  };

  return (
    <div
      className="min-h-screen pt-24 pb-16 px-6"
      style={{
        backgroundImage:
          "linear-gradient(to right, rgba(15,23,42,0.07) 1px, transparent 1px), linear-gradient(to bottom, rgba(15,23,42,0.07) 1px, transparent 1px)",
        backgroundSize: "46px 46px"
      }}
    >
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-2">
            <div className="mb-7">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">Tools / ICF Takeoff</span>
                <span className="border border-orange-300 bg-orange-500 text-white px-2 py-0.5 text-[10px] uppercase tracking-wider font-bold">Beta</span>
              </div>
              <h1 className="text-5xl md:text-6xl font-extrabold leading-[0.95] tracking-tight">
                <span className="text-zinc-900">ICF TAKEOFF</span>
                <br />
                <span className="text-orange-500">ESTIMATOR.</span>
              </h1>
              <p className="mt-5 text-zinc-700 max-w-2xl text-lg">
                Early access for production takeoffs. Upload floor plan PDFs, parse wall geometry, and get instant wall metrics with 3D wall layout.
              </p>
            </div>

            <div className="border border-zinc-300 bg-white/95 shadow-[0_1px_0_rgba(0,0,0,0.03)]">
              <div className="p-4 space-y-4">
                <input
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="Project Name"
                  className="w-full h-11 px-3 border border-zinc-300 bg-zinc-50 text-sm outline-none focus:ring-2 focus:ring-orange-200"
                />

                <div className="grid md:grid-cols-2 gap-3">
                  <select
                    value={blockMfg}
                    onChange={(e) => setBlockMfg(e.target.value)}
                    className="h-11 px-3 border border-zinc-300 bg-zinc-50 text-sm outline-none focus:ring-2 focus:ring-orange-200"
                  >
                    {BLOCK_OPTIONS.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                  <select
                    value={coreSize}
                    onChange={(e) => setCoreSize(e.target.value)}
                    className="h-11 px-3 border border-zinc-300 bg-zinc-50 text-sm outline-none focus:ring-2 focus:ring-orange-200"
                  >
                    {CORE_OPTIONS.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500 mb-2">Upload Plans (PDF)</p>
                  <div className="border border-zinc-300 p-3 bg-zinc-50">
                    <input type="file" accept="application/pdf,.pdf" onChange={handleFileUpload} className="text-sm w-full" />
                    {file && <p className="mt-2 text-xs text-zinc-600">Selected: {file.name}</p>}
                  </div>
                </div>

                {error && (
                  <div className="border border-red-300 bg-red-50 p-3 text-sm text-red-700 flex gap-2">
                    <AlertTriangle className="w-4 h-4 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="flex flex-wrap gap-3 pt-1">
                  <button
                    type="button"
                    onClick={handleStartTakeoff}
                    disabled={loading || !file}
                    className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-7 h-11 uppercase tracking-wide disabled:opacity-60"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUpRight className="w-4 h-4" />}
                    {loading ? "Running Takeoff" : "Start Automatic Takeoff"}
                  </button>
                  <a
                    href="mailto:support@icf-hub.com?subject=Takeoff%20Beta%20Feedback"
                    className="inline-flex items-center gap-2 border border-zinc-300 bg-white hover:bg-zinc-50 text-zinc-800 text-sm font-semibold px-7 h-11 uppercase tracking-wide"
                  >
                    Leave Feedback
                    <ArrowRight className="w-4 h-4" />
                  </a>
                </div>

                {loadingMessage && <p className="text-sm text-zinc-600">{loadingMessage}</p>}
              </div>
            </div>
          </div>

          <div className="border border-zinc-300 bg-white/95 p-6">
            <h3 className="text-[11px] uppercase tracking-[0.22em] text-zinc-500 mb-4">Beta Status</h3>
            <div className="space-y-4 text-sm">
              <StatusRow label="Version" value="0.1-beta" />
              <StatusRow label="Access" value="Open to All" />
              <StatusRow label="Pricing" value="Free During Beta" />
              <StatusRow label="Feedback Loop" value="Weekly Triage" />
            </div>
            <div className="mt-6 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-zinc-600">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              Beta Open
            </div>
            <div className="mt-5 text-xs text-zinc-500">Current user: {profileLabel}</div>
          </div>
        </div>

        {summary && (
          <div className="mt-10 space-y-6">
            <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <MetricCard icon={Ruler} label="Total Linear Feet" value={`${summary.total_linear_feet} ft`} />
              <MetricCard icon={Building2} label="Net Wall Sqft" value={`${summary.net_wall_sqft} sqft`} />
              <MetricCard icon={ScanLine} label="Openings" value={`${summary.opening_count}`} />
              <MetricCard icon={Sparkles} label="Ceiling Heights" value={`${summary.ceiling_height_ft} ft`} />
            </div>

            <div className="border border-zinc-300 bg-white p-6">
              <h2 className="font-semibold text-zinc-900 mb-3">3D Model Layout of Walls</h2>
              <Takeoff3DViewer model3d={model3d} />
            </div>

            <div className="border border-zinc-300 bg-white p-6 overflow-x-auto">
              <h2 className="font-semibold text-zinc-900 mb-4">Parsed Walls</h2>
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-zinc-200 text-zinc-600">
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
                    <tr key={wall.id} className="border-b border-zinc-100">
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
          </div>
        )}
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value }) {
  return (
    <div className="border border-zinc-300 bg-white p-4">
      <div className="flex items-center gap-2 text-zinc-500 text-[11px] uppercase tracking-wider mb-2">
        <Icon className="w-4 h-4" />
        <span>{label}</span>
      </div>
      <p className="text-2xl font-bold text-zinc-900">{value}</p>
    </div>
  );
}

function StatusRow({ label, value }) {
  return (
    <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
      <span className="text-zinc-500 uppercase tracking-[0.18em] text-[11px]">{label}</span>
      <span className="font-bold text-zinc-900">{value}</span>
    </div>
  );
}
