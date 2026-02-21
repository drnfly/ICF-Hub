import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ChatWidget from "@/components/ChatWidget";
import LandingPage from "@/pages/LandingPage";
import AboutICF from "@/pages/AboutICF";
import ContractorDirectory from "@/pages/ContractorDirectory";
import GetQuote from "@/pages/GetQuote";
import ContractorAuth from "@/pages/ContractorAuth";
import ContractorDashboard from "@/pages/ContractorDashboard";
import Pricing from "@/pages/Pricing";
import PaymentResult from "@/pages/PaymentResult";
import ContentGenerator from "@/pages/ContentGenerator";
import CampaignManager from "@/pages/CampaignManager";
import ContentCalendar from "@/pages/ContentCalendar";
import AnalyticsDashboard from "@/pages/AnalyticsDashboard";
import SocialSettings from "@/pages/SocialSettings";
import EmailSMSGenerator from "@/pages/EmailSMSGenerator";
import AdminLeads from "@/pages/AdminLeads";
import SuperAdmin from "@/pages/SuperAdmin";

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/about-icf" element={<AboutICF />} />
            <Route path="/contractors" element={<ContractorDirectory />} />
            <Route path="/get-quote" element={<GetQuote />} />
            <Route path="/auth" element={<ContractorAuth />} />
            <Route path="/dashboard" element={<ContractorDashboard />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/payment/success" element={<PaymentResult />} />
            <Route path="/payment/cancel" element={<PaymentResult />} />
            <Route path="/tools/communication" element={<EmailSMSGenerator />} />
            <Route path="/content" element={<ContentGenerator />} />
            <Route path="/campaigns" element={<CampaignManager />} />
            <Route path="/calendar" element={<ContentCalendar />} />
            <Route path="/analytics" element={<AnalyticsDashboard />} />
            <Route path="/social" element={<SocialSettings />} />
            <Route path="/admin" element={<SuperAdmin />} />
          </Routes>
        </main>
        <Footer />
        <ChatWidget />
        <Toaster position="top-right" />
      </div>
    </BrowserRouter>
  );
}

export default App;
