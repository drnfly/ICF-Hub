import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Check, X, Loader2 } from "lucide-react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function PaymentResult() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("loading"); // loading, success, error, cancel
  const sessionId = searchParams.get("session_id");
  const isCancel = window.location.pathname.includes("cancel");

  useEffect(() => {
    if (isCancel) {
      setStatus("cancel");
      return;
    }

    if (!sessionId) {
      setStatus("error");
      return;
    }

    const checkStatus = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${API}/payments/status/${sessionId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (res.data.payment_status === "paid") {
          setStatus("success");
        } else {
          setStatus("pending"); // Or handle other statuses
        }
      } catch (err) {
        console.error(err);
        setStatus("error");
      }
    };

    checkStatus();
  }, [sessionId, isCancel]);

  return (
    <div className="pt-24 min-h-screen flex items-center justify-center bg-secondary/30">
      <div className="bg-card border border-border rounded-sm p-12 max-w-md w-full text-center shadow-lg">
        {status === "loading" || status === "pending" ? (
          <>
            <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-6" />
            <h2 className="text-2xl font-bold mb-2">Processing Payment...</h2>
            <p className="text-muted-foreground">Please wait while we confirm your transaction.</p>
          </>
        ) : status === "success" ? (
          <>
            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="w-8 h-8 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold mb-4">Payment Successful!</h2>
            <p className="text-muted-foreground mb-8">
              Welcome to Pro! Your account has been upgraded and all features are unlocked.
            </p>
            <Button onClick={() => navigate("/dashboard")} className="w-full">
              GO TO DASHBOARD
            </Button>
          </>
        ) : status === "cancel" ? (
          <>
             <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <X className="w-8 h-8 text-yellow-500" />
            </div>
            <h2 className="text-2xl font-bold mb-4">Payment Cancelled</h2>
            <p className="text-muted-foreground mb-8">
              No charges were made. You can try again whenever you're ready.
            </p>
            <Button onClick={() => navigate("/pricing")} variant="outline" className="w-full">
              RETURN TO PRICING
            </Button>
          </>
        ) : (
          <>
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <X className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="text-2xl font-bold mb-4">Something Went Wrong</h2>
            <p className="text-muted-foreground mb-8">
              We couldn't verify your payment. Please contact support if this persists.
            </p>
            <Button onClick={() => navigate("/dashboard")} variant="outline" className="w-full">
              GO TO DASHBOARD
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
