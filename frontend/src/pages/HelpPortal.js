import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function HelpPortal() {
  const token = localStorage.getItem("icf_token");
  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  const [tab, setTab] = useState("workers");

  const [workerForm, setWorkerForm] = useState({
    name: "",
    email: "",
    phone: "",
    city: "",
    state: "",
    years_icf_experience: 0,
    pay_rate_min: "",
    pay_rate_max: "",
    preferred_roles: "",
    certifications: "",
    equipment: "",
    availability: "",
    travel_radius_miles: "",
    notes: ""
  });

  const [workerFilters, setWorkerFilters] = useState({ search: "", city: "", state: "", role: "", min_experience: "", max_pay: "" });
  const [workers, setWorkers] = useState([]);
  const [savedWorkers, setSavedWorkers] = useState([]);
  const [invitingWorkerId, setInvitingWorkerId] = useState(null);
  const [inviteDraft, setInviteDraft] = useState({ project_title: "", message: "", pay_offer: "" });

  const [jobForm, setJobForm] = useState({
    title: "",
    location: "",
    stage: "",
    pay_rate: "",
    description: "",
    required_experience_years: "",
    skills: ""
  });
  const [jobs, setJobs] = useState([]);
  const [applyingJobId, setApplyingJobId] = useState(null);
  const [applyForm, setApplyForm] = useState({ worker_name: "", email: "", phone: "", experience_years: "", notes: "" });

  const canUseContractorTools = Boolean(token);

  const workerRoleTags = useMemo(
    () => ["Installer", "Foreman", "Pump Operator", "Framer", "Finisher", "Estimator"],
    []
  );

  const fetchWorkers = async () => {
    if (!canUseContractorTools) return;
    try {
      const params = {
        search: workerFilters.search,
        city: workerFilters.city,
        state: workerFilters.state,
        role: workerFilters.role,
        min_experience: workerFilters.min_experience || undefined,
        max_pay: workerFilters.max_pay || undefined
      };
      const { data } = await axios.get(`${API}/workers`, { params, headers: authHeaders });
      setWorkers(data || []);
    } catch (e) {
      toast.error("Could not load workers");
    }
  };

  const fetchSavedWorkers = async () => {
    if (!canUseContractorTools) return;
    try {
      const { data } = await axios.get(`${API}/workers/saved`, { headers: authHeaders });
      setSavedWorkers(data || []);
    } catch {
      setSavedWorkers([]);
    }
  };

  const fetchJobs = async () => {
    try {
      const { data } = await axios.get(`${API}/jobs`);
      setJobs(data || []);
    } catch {
      setJobs([]);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  useEffect(() => {
    fetchWorkers();
    fetchSavedWorkers();
  }, [token]);

  const registerWorker = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...workerForm,
        years_icf_experience: Number(workerForm.years_icf_experience || 0),
        pay_rate_min: Number(workerForm.pay_rate_min || 0),
        pay_rate_max: workerForm.pay_rate_max ? Number(workerForm.pay_rate_max) : null,
        travel_radius_miles: workerForm.travel_radius_miles ? Number(workerForm.travel_radius_miles) : null,
        preferred_roles: workerForm.preferred_roles
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean)
      };
      await axios.post(`${API}/workers/register`, payload);
      toast.success("Profile submitted. Admin approval required before contractors can view it.");
      setWorkerForm({
        name: "",
        email: "",
        phone: "",
        city: "",
        state: "",
        years_icf_experience: 0,
        pay_rate_min: "",
        pay_rate_max: "",
        preferred_roles: "",
        certifications: "",
        equipment: "",
        availability: "",
        travel_radius_miles: "",
        notes: ""
      });
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Could not submit profile");
    }
  };

  const saveWorker = async (workerId) => {
    try {
      await axios.post(`${API}/workers/${workerId}/save`, {}, { headers: authHeaders });
      toast.success("Worker saved to shortlist");
      fetchSavedWorkers();
    } catch {
      toast.error("Could not save worker");
    }
  };

  const sendInvite = async (workerId) => {
    if (!inviteDraft.project_title) {
      toast.error("Project title is required");
      return;
    }

    try {
      await axios.post(
        `${API}/workers/${workerId}/invite`,
        {
          project_title: inviteDraft.project_title,
          message: inviteDraft.message,
          pay_offer: inviteDraft.pay_offer ? Number(inviteDraft.pay_offer) : null
        },
        { headers: authHeaders }
      );
      toast.success("Invite sent");
      setInvitingWorkerId(null);
      setInviteDraft({ project_title: "", message: "", pay_offer: "" });
    } catch {
      toast.error("Could not send invite");
    }
  };

  const createJob = async (e) => {
    e.preventDefault();
    if (!token) {
      toast.error("Sign in as contractor to post jobs");
      return;
    }

    try {
      await axios.post(
        `${API}/jobs`,
        {
          ...jobForm,
          required_experience_years: Number(jobForm.required_experience_years || 0),
          skills: jobForm.skills
            .split(",")
            .map((x) => x.trim())
            .filter(Boolean)
        },
        { headers: authHeaders }
      );
      toast.success("Job posted. Pending admin approval.");
      setJobForm({ title: "", location: "", stage: "", pay_rate: "", description: "", required_experience_years: "", skills: "" });
    } catch {
      toast.error("Could not create job");
    }
  };

  const applyToJob = async (jobId) => {
    try {
      await axios.post(`${API}/jobs/${jobId}/apply`, {
        ...applyForm,
        experience_years: Number(applyForm.experience_years || 0)
      });
      toast.success("Application submitted");
      setApplyingJobId(null);
      setApplyForm({ worker_name: "", email: "", phone: "", experience_years: "", notes: "" });
    } catch {
      toast.error("Could not apply");
    }
  };

  return (
    <div className="pt-24 pb-16 min-h-screen bg-secondary/20">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 space-y-8">
        <div>
          <span className="mono-label mb-3 block">ICF WORKFORCE PORTAL</span>
          <h1 className="text-3xl md:text-4xl font-bold" style={{ fontFamily: "'Clash Display', sans-serif" }}>
            Find Better <span className="text-primary">ICF Help</span>
          </h1>
          <p className="text-muted-foreground mt-2 max-w-3xl">
            Register experienced ICF workers, search by pay rate and skill level, shortlist/invite candidates, and run a lightweight ICF job board.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <TabBtn active={tab === "workers"} onClick={() => setTab("workers")}>Find Workers</TabBtn>
          <TabBtn active={tab === "register"} onClick={() => setTab("register")}>Register as Worker</TabBtn>
          <TabBtn active={tab === "jobs"} onClick={() => setTab("jobs")}>Job Board</TabBtn>
        </div>

        {tab === "workers" && (
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="bg-card border border-border rounded-sm p-5 space-y-3">
              <h3 className="font-bold">Worker Filters</h3>
              {!canUseContractorTools && <p className="text-xs text-muted-foreground">Sign in as contractor to search and invite workers.</p>}
              <input className="w-full rounded-sm border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="Search name/role/city" value={workerFilters.search} onChange={(e) => setWorkerFilters((p) => ({ ...p, search: e.target.value }))} />
              <input className="w-full rounded-sm border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="City" value={workerFilters.city} onChange={(e) => setWorkerFilters((p) => ({ ...p, city: e.target.value }))} />
              <input className="w-full rounded-sm border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="State" value={workerFilters.state} onChange={(e) => setWorkerFilters((p) => ({ ...p, state: e.target.value }))} />
              <select className="w-full rounded-sm border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" value={workerFilters.role} onChange={(e) => setWorkerFilters((p) => ({ ...p, role: e.target.value }))}>
                <option value="">Any role</option>
                {workerRoleTags.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              <input className="w-full rounded-sm border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" type="number" placeholder="Min experience (years)" value={workerFilters.min_experience} onChange={(e) => setWorkerFilters((p) => ({ ...p, min_experience: e.target.value }))} />
              <input className="w-full rounded-sm border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" type="number" placeholder="Max pay rate ($/hr)" value={workerFilters.max_pay} onChange={(e) => setWorkerFilters((p) => ({ ...p, max_pay: e.target.value }))} />
              <button className="inline-flex w-full items-center justify-center rounded-sm bg-primary px-4 py-2 text-xs font-bold uppercase tracking-wider text-primary-foreground hover:bg-primary/90 disabled:opacity-50" onClick={fetchWorkers} disabled={!canUseContractorTools}>Apply Filters</button>
            </div>

            <div className="lg:col-span-2 space-y-4">
              {workers.length === 0 ? (
                <div className="bg-card border border-border rounded-sm p-8 text-center text-muted-foreground">No approved workers found yet.</div>
              ) : workers.map((worker) => {
                const saved = savedWorkers.some((w) => w.id === worker.id);
                return (
                  <div key={worker.id} className="bg-card border border-border rounded-sm p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h4 className="text-lg font-semibold">{worker.name}</h4>
                        <p className="text-sm text-muted-foreground">{worker.city}, {worker.state} • {worker.years_icf_experience} yrs ICF</p>
                        <p className="text-sm mt-1">${worker.pay_rate_min} - ${worker.pay_rate_max}/hr • {worker.availability || "Availability not set"}</p>
                        <p className="text-sm mt-1 text-muted-foreground">Roles: {(worker.preferred_roles || []).join(", ") || "N/A"}</p>
                      </div>
                      <div className="flex gap-2">
                        <button className="inline-flex items-center justify-center rounded-sm border border-border bg-background px-4 py-2 text-xs font-bold uppercase tracking-wider text-foreground hover:bg-muted disabled:opacity-50" disabled={!canUseContractorTools || saved} onClick={() => saveWorker(worker.id)}>{saved ? "Saved" : "Shortlist"}</button>
                        <button className="inline-flex items-center justify-center rounded-sm bg-primary px-4 py-2 text-xs font-bold uppercase tracking-wider text-primary-foreground hover:bg-primary/90 disabled:opacity-50" disabled={!canUseContractorTools} onClick={() => setInvitingWorkerId(worker.id)}>Invite</button>
                      </div>
                    </div>

                    {invitingWorkerId === worker.id && (
                      <div className="mt-4 grid md:grid-cols-3 gap-2">
                        <input className="w-full rounded-sm border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="Project title" value={inviteDraft.project_title} onChange={(e) => setInviteDraft((p) => ({ ...p, project_title: e.target.value }))} />
                        <input className="w-full rounded-sm border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="Pay offer ($/hr)" type="number" value={inviteDraft.pay_offer} onChange={(e) => setInviteDraft((p) => ({ ...p, pay_offer: e.target.value }))} />
                        <input className="w-full rounded-sm border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="Message" value={inviteDraft.message} onChange={(e) => setInviteDraft((p) => ({ ...p, message: e.target.value }))} />
                        <button className="inline-flex items-center justify-center rounded-sm bg-primary px-4 py-2 text-xs font-bold uppercase tracking-wider text-primary-foreground hover:bg-primary/90 disabled:opacity-50 md:col-span-3" onClick={() => sendInvite(worker.id)}>Send Invite</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === "register" && (
          <form onSubmit={registerWorker} className="bg-card border border-border rounded-sm p-6 grid md:grid-cols-2 gap-4">
            <Input label="Full Name" value={workerForm.name} onChange={(v) => setWorkerForm((p) => ({ ...p, name: v }))} required />
            <Input label="Email" type="email" value={workerForm.email} onChange={(v) => setWorkerForm((p) => ({ ...p, email: v }))} required />
            <Input label="Phone" value={workerForm.phone} onChange={(v) => setWorkerForm((p) => ({ ...p, phone: v }))} required />
            <Input label="City" value={workerForm.city} onChange={(v) => setWorkerForm((p) => ({ ...p, city: v }))} required />
            <Input label="State" value={workerForm.state} onChange={(v) => setWorkerForm((p) => ({ ...p, state: v }))} required />
            <Input label="ICF Experience (years)" type="number" value={workerForm.years_icf_experience} onChange={(v) => setWorkerForm((p) => ({ ...p, years_icf_experience: v }))} />
            <Input label="Min Pay Rate ($/hr)" type="number" value={workerForm.pay_rate_min} onChange={(v) => setWorkerForm((p) => ({ ...p, pay_rate_min: v }))} required />
            <Input label="Max Pay Rate ($/hr)" type="number" value={workerForm.pay_rate_max} onChange={(v) => setWorkerForm((p) => ({ ...p, pay_rate_max: v }))} />
            <Input label="Preferred Roles (comma separated)" value={workerForm.preferred_roles} onChange={(v) => setWorkerForm((p) => ({ ...p, preferred_roles: v }))} />
            <Input label="Availability" value={workerForm.availability} onChange={(v) => setWorkerForm((p) => ({ ...p, availability: v }))} />
            <Input label="Travel Radius (miles)" type="number" value={workerForm.travel_radius_miles} onChange={(v) => setWorkerForm((p) => ({ ...p, travel_radius_miles: v }))} />
            <Input label="Certifications" value={workerForm.certifications} onChange={(v) => setWorkerForm((p) => ({ ...p, certifications: v }))} />
            <Input label="Equipment/Tools" value={workerForm.equipment} onChange={(v) => setWorkerForm((p) => ({ ...p, equipment: v }))} />
            <div className="md:col-span-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notes</label>
              <textarea className="w-full rounded-sm border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 min-h-[90px] mt-1" value={workerForm.notes} onChange={(e) => setWorkerForm((p) => ({ ...p, notes: e.target.value }))} />
            </div>
            <div className="md:col-span-2">
              <button className="inline-flex items-center justify-center rounded-sm bg-primary px-4 py-2 text-xs font-bold uppercase tracking-wider text-primary-foreground hover:bg-primary/90 disabled:opacity-50">Submit Worker Profile</button>
            </div>
          </form>
        )}

        {tab === "jobs" && (
          <div className="grid lg:grid-cols-3 gap-6">
            <form onSubmit={createJob} className="bg-card border border-border rounded-sm p-5 space-y-3">
              <h3 className="font-bold">Post a Job (Contractors)</h3>
              {!token && <p className="text-xs text-muted-foreground">Sign in as contractor to post jobs.</p>}
              <input className="w-full rounded-sm border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="Job title" value={jobForm.title} onChange={(e) => setJobForm((p) => ({ ...p, title: e.target.value }))} required />
              <input className="w-full rounded-sm border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="Location" value={jobForm.location} onChange={(e) => setJobForm((p) => ({ ...p, location: e.target.value }))} required />
              <input className="w-full rounded-sm border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="Project stage" value={jobForm.stage} onChange={(e) => setJobForm((p) => ({ ...p, stage: e.target.value }))} required />
              <input className="w-full rounded-sm border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="Pay rate details" value={jobForm.pay_rate} onChange={(e) => setJobForm((p) => ({ ...p, pay_rate: e.target.value }))} required />
              <textarea className="w-full rounded-sm border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 min-h-[90px]" placeholder="Job description" value={jobForm.description} onChange={(e) => setJobForm((p) => ({ ...p, description: e.target.value }))} required />
              <input className="w-full rounded-sm border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" type="number" placeholder="Required ICF experience (years)" value={jobForm.required_experience_years} onChange={(e) => setJobForm((p) => ({ ...p, required_experience_years: e.target.value }))} />
              <input className="w-full rounded-sm border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="Skills (comma separated)" value={jobForm.skills} onChange={(e) => setJobForm((p) => ({ ...p, skills: e.target.value }))} />
              <button className="inline-flex w-full items-center justify-center rounded-sm bg-primary px-4 py-2 text-xs font-bold uppercase tracking-wider text-primary-foreground hover:bg-primary/90 disabled:opacity-50" disabled={!token}>Post Job</button>
            </form>

            <div className="lg:col-span-2 space-y-4">
              <div className="flex justify-end">
                <button className="inline-flex items-center justify-center rounded-sm border border-border bg-background px-4 py-2 text-xs font-bold uppercase tracking-wider text-foreground hover:bg-muted disabled:opacity-50" onClick={fetchJobs}>Refresh Jobs</button>
              </div>
              {jobs.length === 0 ? (
                <div className="bg-card border border-border rounded-sm p-8 text-center text-muted-foreground">No approved jobs yet.</div>
              ) : jobs.map((job) => (
                <div key={job.id} className="bg-card border border-border rounded-sm p-5">
                  <h4 className="text-lg font-semibold">{job.title}</h4>
                  <p className="text-sm text-muted-foreground">{job.location} • Stage: {job.stage}</p>
                  <p className="text-sm mt-1">Pay: {job.pay_rate}</p>
                  <p className="text-sm mt-1 text-muted-foreground">{job.description}</p>
                  <p className="text-xs mt-2 text-muted-foreground">Required Experience: {job.required_experience_years} years • Skills: {(job.skills || []).join(", ") || "N/A"}</p>

                  <div className="mt-3">
                    <button className="inline-flex items-center justify-center rounded-sm bg-primary px-4 py-2 text-xs font-bold uppercase tracking-wider text-primary-foreground hover:bg-primary/90 disabled:opacity-50" onClick={() => setApplyingJobId(applyingJobId === job.id ? null : job.id)}>
                      {applyingJobId === job.id ? "Cancel" : "Apply"}
                    </button>
                  </div>

                  {applyingJobId === job.id && (
                    <div className="mt-3 grid md:grid-cols-2 gap-2">
                      <input className="w-full rounded-sm border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="Your name" value={applyForm.worker_name} onChange={(e) => setApplyForm((p) => ({ ...p, worker_name: e.target.value }))} />
                      <input className="w-full rounded-sm border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="Email" type="email" value={applyForm.email} onChange={(e) => setApplyForm((p) => ({ ...p, email: e.target.value }))} />
                      <input className="w-full rounded-sm border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="Phone" value={applyForm.phone} onChange={(e) => setApplyForm((p) => ({ ...p, phone: e.target.value }))} />
                      <input className="w-full rounded-sm border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="Experience years" type="number" value={applyForm.experience_years} onChange={(e) => setApplyForm((p) => ({ ...p, experience_years: e.target.value }))} />
                      <textarea className="w-full rounded-sm border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 min-h-[80px] md:col-span-2" placeholder="Why you fit this role" value={applyForm.notes} onChange={(e) => setApplyForm((p) => ({ ...p, notes: e.target.value }))} />
                      <button className="inline-flex items-center justify-center rounded-sm bg-primary px-4 py-2 text-xs font-bold uppercase tracking-wider text-primary-foreground hover:bg-primary/90 disabled:opacity-50 md:col-span-2" onClick={() => applyToJob(job.id)}>Submit Application</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-sm text-xs uppercase tracking-widest font-bold border ${
        active ? "bg-primary text-primary-foreground border-primary" : "bg-white border-border text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function Input({ label, value, onChange, required = false, type = "text" }) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</label>
      <input className="w-full rounded-sm border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 mt-1" type={type} required={required} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
