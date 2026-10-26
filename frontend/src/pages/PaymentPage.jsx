import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  QrCode,
  Smartphone,
  Building2,
  ShieldCheck,
  AlertCircle,
  Receipt,
  Truck,
  MapPin,
  Calendar,
  Layers,
  Scale,
} from "lucide-react";
import NotificationBell from "../components/NotificationBell";
import PaymentReceiptModal from "../components/PaymentReceiptModal";
import "../components/PaymentPage.css";
import { BASE_URL as API_BASE_URL } from "../api/api";
import { safeNavigateBack } from "../utils/navigation";

function getAccessToken() {
  return (
    localStorage.getItem("access") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
    ""
  );
}

export default function PaymentPage() {
  const { pickupId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [paymentData, setPaymentData] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [selectedMethod, setSelectedMethod] = useState("upi");
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [paymentCompleted, setPaymentCompleted] = useState(false);

  useEffect(() => {
    fetchPaymentDetails();
  }, [pickupId]);

  const fetchPaymentDetails = async () => {
    try {
      setLoading(true);
      setErrorMsg("");
      const token = getAccessToken();
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};

      const res = await axios.get(`${API_BASE_URL}/api/waste/payments/pickup/${pickupId}/`, config);
      if (res.data?.success && res.data?.payment) {
        setPaymentData(res.data.payment);
        if (res.data.payment.payment_status === "COMPLETED") {
          setPaymentCompleted(true);
        }
      } else {
        setErrorMsg("Failed to load payment details for this pickup.");
      }
    } catch (err) {
      console.error("Payment load error:", err);
      setErrorMsg(err.response?.data?.error || "Unable to load payment details. Please check the pickup request.");
    } finally {
      setLoading(false);
    }
  };

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePay = async () => {
    if (processing || paymentCompleted) return;

    try {
      setProcessing(true);
      setErrorMsg("");
      const token = getAccessToken();
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};

      const methodNames = {
        upi: "UPI (Google Pay / PhonePe / Paytm)",
        card: "Debit / Credit Card",
        netbanking: "Net Banking",
      };
      const chosenMethod = methodNames[selectedMethod] || "UPI / Online";

      // 1. Create Razorpay order on backend
      const orderRes = await axios.post(
        `${API_BASE_URL}/api/waste/payments/create-order/`,
        { pickup_id: parseInt(pickupId, 10) },
        config
      );

      if (!orderRes.data?.success) {
        throw new Error(orderRes.data?.error || "Failed to initialize payment order.");
      }

      if (orderRes.data?.already_paid) {
        setPaymentData(orderRes.data.payment);
        setPaymentCompleted(true);
        setShowReceiptModal(true);
        setProcessing(false);
        return;
      }

      const { order_id, amount, currency, key_id } = orderRes.data;
      const razorpayKey = key_id || import.meta.env.VITE_RAZORPAY_KEY_ID;

      // Ensure Razorpay SDK is loaded
      const isLoaded = await loadRazorpayScript();

      if (razorpayKey && isLoaded && window.Razorpay) {
        // 2. Launch Official Razorpay Checkout Modal
        const options = {
          key: razorpayKey,
          amount: Math.round((amount || 50) * 100), // amount in paise
          currency: currency || "INR",
          name: "EcoPulse Waste Management",
          description: `Disposal Fee for Pickup #${pickupId}`,
          image: "/favicon.svg",
          order_id: order_id,
          handler: async function (response) {
            try {
              // 3. Verify Razorpay signature on backend
              const verifyRes = await axios.post(
                `${API_BASE_URL}/api/waste/payments/verify/`,
                {
                  pickup_id: parseInt(pickupId, 10),
                  transaction_id: response.razorpay_payment_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_signature: response.razorpay_signature,
                  payment_method: chosenMethod,
                },
                config
              );

              if (verifyRes.data?.success && verifyRes.data?.payment) {
                setPaymentData(verifyRes.data.payment);
                setPaymentCompleted(true);
                setShowReceiptModal(true);
              } else {
                setErrorMsg(verifyRes.data?.error || "Payment verification failed. Please contact support.");
              }
            } catch (vErr) {
              console.error("Verification error:", vErr);
              setErrorMsg(vErr.response?.data?.error || "Error verifying payment signature.");
            } finally {
              setProcessing(false);
            }
          },
          prefill: {
            name: localStorage.getItem("name") || "Citizen",
            email: localStorage.getItem("email") || "",
          },
          notes: {
            pickup_id: String(pickupId),
            service: "Doorstep Municipal Waste Collection",
          },
          theme: {
            color: "#10b981",
          },
          modal: {
            ondismiss: function () {
              setProcessing(false);
            },
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.on("payment.failed", function (failResponse) {
          console.error("Razorpay payment failed:", failResponse.error);
          setErrorMsg(failResponse.error?.description || "Payment was declined or cancelled.");
          setProcessing(false);
        });
        rzp.open();
      } else {
        // Fallback for local development if keys are not yet provided
        const verifyPayload = {
          pickup_id: parseInt(pickupId, 10),
          razorpay_order_id: order_id,
          payment_method: chosenMethod,
        };

        const res = await axios.post(`${API_BASE_URL}/api/waste/payments/verify/`, verifyPayload, config);

        if (res.data?.success && res.data?.payment) {
          setPaymentData(res.data.payment);
          setPaymentCompleted(true);
          setShowReceiptModal(true);
        } else {
          setErrorMsg(res.data?.error || "Payment verification failed. Please try again.");
        }
        setProcessing(false);
      }
    } catch (err) {
      console.error("Payment processing error:", err);
      setErrorMsg(err.response?.data?.error || err.message || "Payment processing failed. Please try again.");
      setProcessing(false);
    }
  };

  return (
    <div className="ep-payment-page">
      {/* TOPBAR */}
      <header className="ep-payment-topbar">
        <div className="ep-payment-topbar-left">
          <button className="ep-payment-back-btn" onClick={() => safeNavigateBack(navigate, "/user")}>
            <ArrowLeft size={16} />
            Dashboard
          </button>
          <div
            className="ep-payment-brand"
            onClick={() => navigate("/user")}
            style={{ cursor: "pointer" }}
            title="EcoPulse Dashboard"
          >
            Eco<span>Pulse</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <NotificationBell />
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="ep-payment-container">
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div style={{ width: 40, height: 40, border: "3px solid #d1fae5", borderTopColor: "#10b981", borderRadius: "50%", margin: "0 auto 16px", animation: "staffSpin 1s linear infinite" }} />
            <div style={{ fontSize: 16, fontWeight: 600, color: "#064e3b" }}>Loading Payment Information...</div>
            <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>Connecting to municipal billing gateway</div>
          </div>
        ) : errorMsg && !paymentData ? (
          <div className="ep-payment-card" style={{ textAlign: "center", borderColor: "#fecaca", background: "#fff5f5" }}>
            <AlertCircle size={40} color="#dc2626" style={{ margin: "0 auto 12px" }} />
            <h2 style={{ color: "#991b1b", fontSize: 18, marginBottom: 8 }}>Unable to Process Payment</h2>
            <p style={{ color: "#7f1d1d", fontSize: 14, marginBottom: 20 }}>{errorMsg}</p>
            <button className="ep-payment-back-btn" onClick={() => navigate("/user")}>
              Return to User Dashboard
            </button>
          </div>
        ) : paymentCompleted ? (
          /* COMPLETED SUCCESS CARD */
          <div className="ep-payment-card ep-payment-success-card">
            <div className="ep-success-icon-wrap">
              <CheckCircle2 size={38} />
            </div>
            <h2 className="ep-success-title">Payment Completed!</h2>
            <p className="ep-success-desc">
              Your fixed municipal collection fee of <strong>₹50.00</strong> for <strong>Pickup #{pickupId}</strong> has been successfully processed and recorded.
            </p>

            <div style={{ maxWidth: 440, margin: "0 auto 28px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: "16px 20px", textAlign: "left", fontSize: 13 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ color: "#64748b" }}>Payment ID:</span>
                <strong style={{ color: "#059669" }}>{paymentData?.payment_id || "PAY-RECORDED"}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ color: "#64748b" }}>Transaction ID:</span>
                <strong style={{ fontFamily: "monospace" }}>{paymentData?.transaction_id || "TXN-VERIFIED"}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#64748b" }}>Status:</span>
                <span className="ep-receipt-status-badge">
                  <CheckCircle2 size={12} />
                  COMPLETED
                </span>
              </div>
            </div>

            <div className="ep-success-actions">
              <button
                type="button"
                className="ep-receipt-btn-print"
                onClick={() => setShowReceiptModal(true)}
              >
                <Receipt size={18} />
                View / Print Official Receipt
              </button>
              <button
                type="button"
                className="ep-receipt-btn-close"
                onClick={() => navigate("/user")}
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        ) : (
          /* PAYMENT CHECKOUT FORM */
          <div className="ep-payment-card">
            <div className="ep-payment-card-header">
              <div>
                <h1 className="ep-payment-title">Waste Pickup Payment</h1>
                <p className="ep-payment-subtitle">
                  Fixed municipal fee payment for completed waste collection service
                </p>
              </div>
              <div className="ep-pickup-badge">
                <Truck size={15} />
                Pickup #{pickupId}
              </div>
            </div>

            {errorMsg && (
              <div style={{ padding: "12px 16px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, color: "#b91c1c", fontSize: 13.5, marginBottom: 20 }}>
                {errorMsg}
              </div>
            )}

            {/* PICKUP SUMMARY */}
            <div className="ep-pickup-summary-grid">
              <div>
                <div className="ep-pickup-field-label">Waste Category</div>
                <div className="ep-pickup-field-val" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Layers size={15} color="#10b981" />
                  {paymentData?.waste_type || "Segregated Waste"}
                </div>
              </div>

              <div>
                <div className="ep-pickup-field-label">Pickup Location</div>
                <div className="ep-pickup-field-val" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <MapPin size={15} color="#10b981" />
                  {paymentData?.pickup_location || "Registered Address"}
                </div>
              </div>

              {paymentData?.ward && (
                <div>
                  <div className="ep-pickup-field-label">Municipal Ward</div>
                  <div className="ep-pickup-field-val">
                    {paymentData.ward}
                  </div>
                </div>
              )}

              {paymentData?.completed_weight && (
                <div>
                  <div className="ep-pickup-field-label">Verified Weight</div>
                  <div className="ep-pickup-field-val" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Scale size={15} color="#10b981" />
                    {paymentData.completed_weight} kg
                  </div>
                </div>
              )}

              <div>
                <div className="ep-pickup-field-label">Pickup Date</div>
                <div className="ep-pickup-field-val" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Calendar size={15} color="#10b981" />
                  {paymentData?.pickup_date || "Completed"}
                </div>
              </div>
            </div>

            {/* FIXED FEE BANNER */}
            <div className="ep-fee-box">
              <div>
                <div className="ep-fee-title">Fixed Collection Fee</div>
                <div className="ep-fee-desc">Standard municipal tariff for doorstep waste pickup</div>
              </div>
              <div className="ep-fee-amount">
                ₹50
              </div>
            </div>

            {/* PAYMENT METHODS */}
            <div className="ep-method-section-title">Select Payment Mode</div>
            <div className="ep-methods-grid">
              <div
                className={`ep-method-card ${selectedMethod === "upi" ? "active" : ""}`}
                onClick={() => setSelectedMethod("upi")}
              >
                <div className="ep-method-head">
                  <span className="ep-method-name">UPI / QR</span>
                  <QrCode size={18} color="#10b981" />
                </div>
                <span className="ep-method-desc">GPay, PhonePe, Paytm, BHIM</span>
              </div>

              <div
                className={`ep-method-card ${selectedMethod === "card" ? "active" : ""}`}
                onClick={() => setSelectedMethod("card")}
              >
                <div className="ep-method-head">
                  <span className="ep-method-name">Cards</span>
                  <CreditCard size={18} color="#10b981" />
                </div>
                <span className="ep-method-desc">Visa, Mastercard, RuPay</span>
              </div>

              <div
                className={`ep-method-card ${selectedMethod === "netbanking" ? "active" : ""}`}
                onClick={() => setSelectedMethod("netbanking")}
              >
                <div className="ep-method-head">
                  <span className="ep-method-name">Net Banking</span>
                  <Building2 size={18} color="#10b981" />
                </div>
                <span className="ep-method-desc">All major Indian banks</span>
              </div>
            </div>

            {/* PAY BUTTON */}
            <button
              type="button"
              className="ep-pay-submit-btn"
              onClick={handlePay}
              disabled={processing || loading}
            >
              <ShieldCheck size={20} />
              {processing ? "Processing Secure Payment..." : "Pay ₹50"}
            </button>

            <div style={{ textAlign: "center", marginTop: 14, fontSize: 12, color: "#718d7f", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <ShieldCheck size={14} color="#10b981" />
              256-Bit SSL Encrypted & Municipal Verified Payment Gateway
            </div>
          </div>
        )}
      </main>

      {/* RECEIPT MODAL */}
      {showReceiptModal && (
        <PaymentReceiptModal
          payment={paymentData}
          onClose={() => setShowReceiptModal(false)}
        />
      )}
    </div>
  );
}
