"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import "../globals.css";

// Separate component to use useSearchParams inside Suspense
function QrContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [timeLeft, setTimeLeft] = useState(60);
  const [connectionStatus, setConnectionStatus] = useState("Aguardando conexão...");
  const [success, setSuccess] = useState(false);
  const [toast, setToast] = useState({ show: false, message: "", type: "ok" });

  useEffect(() => {
    const qr = searchParams.get("qr");
    const company = searchParams.get("company");
    
    if (!qr) {
      router.push("/");
      return;
    }

    setQrCodeUrl(qr);
    if (company) setCompanyName(company);
    
    // Auto logout on load
    fetch('/api/logout', { method: 'POST' }).catch(() => {});

  }, [searchParams, router]);

  // Timers
  useEffect(() => {
    if (success) return;

    const countdown = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    const refresh = setInterval(() => {
      setTimeLeft(60);
      setQrCodeUrl((prev) => {
        if (prev.startsWith('data:')) return prev;
        let url = prev.replace(/[&?]t=\d{13,}/, '');
        url = url.replace(/[?&]$/, '');
        return url + (url.includes('?') ? '&' : '?') + 't=' + Date.now();
      });
    }, 60000);

    return () => {
      clearInterval(countdown);
      clearInterval(refresh);
    };
  }, [success]);

  // Check connection
  useEffect(() => {
    if (!companyName || success) return;

    const checkConnection = async () => {
      try {
        const resp = await fetch('/api/check-connection', { // Adjusted to /api/... expected path or keep relative if I setup redirects
          method: 'POST', // Actually I haven't migrated this route yet. It is /check-connection in original.
          // Since I am migrating everything, I should probably point to where I WILL put it.
          // Or if I run next on same port, I will migrate the route to src/app/api/check-connection/route.js
          // which is exposed at /api/check-connection usually.
          // BUT wait, standard Next.js App Router API routes are at /api/...
          // The current frontend code uses /check-connection.
          // I should update this to /api/check-connection and implement the route there.
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ companyName })
        });
        
        // If route doesn't exist yet (404), this will likely fail JSON parse or return HTML.
        if (!resp.ok) return;

        const result = await resp.json();
        
        if (result.connected) {
          setSuccess(true);
          setConnectionStatus("WhatsApp conectado! ✅");
          showToast('WhatsApp conectado com sucesso! ✅', 'ok');
          setTimeout(() => {
            router.push('/');
          }, 3000);
        }
      } catch (e) {
        // ignore
      }
    };

    const interval = setInterval(checkConnection, 4000);
    return () => clearInterval(interval);
  }, [companyName, success, router]);


  const showToast = (message, type) => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "ok" }), 3500);
  };

  return (
    <div className="qr-page" style={{minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px"}}>
      <div id="toast" className={`toast ${toast.type} ${toast.show ? "show" : ""}`} role="status" aria-live="polite">
        {toast.message}
      </div>

      <div className="qr-container" style={{maxWidth: "600px", width: "100%", background: "white", borderRadius: "24px", padding: "48px 40px", boxShadow: "0 4px 24px rgba(0, 0, 0, 0.06)", textAlign: "center"}}>
        {success && (
          <div className="success-message show" style={{background: "#d1fae5", color: "#065f46", padding: "16px 24px", borderRadius: "12px", fontSize: "15px", fontWeight: "500", marginBottom: "24px", border: "1px solid #10b981"}}>
            ✅ WhatsApp conectado com sucesso!
          </div>
        )}

        <div className="qr-image-wrapper" style={{background: "white", padding: "20px", borderRadius: "20px", border: "1px solid #e5e5e5", margin: "0 auto 24px", display: "inline-block", boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)"}}>
          {qrCodeUrl && <img src={qrCodeUrl} alt="QR Code" style={{width: "280px", height: "280px", display: "block"}} />}
        </div>

        <div className="status-row" style={{display: "flex", alignItems: "center", justifyContent: "center", gap: "24px", marginBottom: "32px", fontSize: "14px", color: "#666"}}>
          <div className="status-item" style={{display: "flex", alignItems: "center", gap: "8px"}}>
            <span className="status-dot" style={{width: "8px", height: "8px", background: "#10b981", borderRadius: "50%"}}></span>
            <span>{success ? "Conectado" : `Atualizando em ${timeLeft}s`}</span>
          </div>
          <div className="status-item" style={{display: "flex", alignItems: "center", gap: "8px"}}>
            <span className="status-dot" style={{width: "8px", height: "8px", background: "#10b981", borderRadius: "50%"}}></span>
            <span>{connectionStatus}</span>
          </div>
        </div>

        <div className="qr-instructions" style={{background: "#fafafa", borderRadius: "16px", padding: "32px", textAlign: "left", marginTop: "32px"}}>
          <h2 style={{fontSize: "16px", fontWeight: "600", margin: "0 0 24px 0", color: "#333", textAlign: "center", textTransform: "uppercase", letterSpacing: "0.5px"}}>Como Conectar:</h2>
          <div className="instructions-grid" style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px"}}>
            <div className="platform-instructions" style={{background: "white", padding: "20px", borderRadius: "12px", border: "1px solid #e5e5e5"}}>
              <div className="platform-header" style={{display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px", fontWeight: "600", color: "#333", fontSize: "15px"}}>
                <span className="platform-icon" style={{fontSize: "20px"}}>🤖</span>
                <span>Android</span>
              </div>
              <div className="instruction-step" style={{marginBottom: "12px", fontSize: "14px", color: "#666", lineHeight: "1.6", paddingLeft: "20px", position: "relative"}}>
                <span style={{position: "absolute", left: 0, fontWeight: "600", color: "#10b981"}}>1.</span> Menu (3 pontos)
              </div>
               <div className="instruction-step" style={{marginBottom: "12px", fontSize: "14px", color: "#666", lineHeight: "1.6", paddingLeft: "20px", position: "relative"}}>
                <span style={{position: "absolute", left: 0, fontWeight: "600", color: "#10b981"}}>2.</span> Aparelhos conectados
              </div>
               <div className="instruction-step" style={{marginBottom: "12px", fontSize: "14px", color: "#666", lineHeight: "1.6", paddingLeft: "20px", position: "relative"}}>
                <span style={{position: "absolute", left: 0, fontWeight: "600", color: "#10b981"}}>3.</span> Conectar aparelho
              </div>
            </div>
            
             <div className="platform-instructions" style={{background: "white", padding: "20px", borderRadius: "12px", border: "1px solid #e5e5e5"}}>
              <div className="platform-header" style={{display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px", fontWeight: "600", color: "#333", fontSize: "15px"}}>
                <span className="platform-icon" style={{fontSize: "20px"}}>🍎</span>
                <span>iPhone</span>
              </div>
              <div className="instruction-step" style={{marginBottom: "12px", fontSize: "14px", color: "#666", lineHeight: "1.6", paddingLeft: "20px", position: "relative"}}>
                <span style={{position: "absolute", left: 0, fontWeight: "600", color: "#10b981"}}>1.</span> Configurações
              </div>
               <div className="instruction-step" style={{marginBottom: "12px", fontSize: "14px", color: "#666", lineHeight: "1.6", paddingLeft: "20px", position: "relative"}}>
                <span style={{position: "absolute", left: 0, fontWeight: "600", color: "#10b981"}}>2.</span> Aparelhos conectados
              </div>
               <div className="instruction-step" style={{marginBottom: "12px", fontSize: "14px", color: "#666", lineHeight: "1.6", paddingLeft: "20px", position: "relative"}}>
                <span style={{position: "absolute", left: 0, fontWeight: "600", color: "#10b981"}}>3.</span> Conectar aparelho
              </div>
            </div>
          </div>
        </div>

        <div className="back-button" style={{marginTop: "32px"}}>
          <Link href="/">
            <button className="btn-secondary" style={{padding: "12px 24px", border: "1px solid #e5e5e5", color: "#666", borderRadius: "8px", fontSize: "14px", cursor: "pointer", background: "transparent"}}>← Voltar ao início</button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function QrPage() {
  return (
    <Suspense fallback={<div style={{padding: "40px", textAlign: "center"}}>Carregando...</div>}>
      <QrContent />
    </Suspense>
  );
}
