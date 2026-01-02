"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle, loading, success, error
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("loading");
    
    try {
        const res = await fetch("/api/auth/forgot-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email })
        });
        
        // Always show success message for security (or whatever the API returns)
        const data = await res.json();
        
        if (res.ok) {
            setStatus("success");
            setMessage(data.message || "Se o e-mail estiver cadastrado, você receberá um link.");
        } else {
            // Even on error, we might want to be vague, but if it's a connection error, show it.
            // API currently returns "Email é obrigatório" or generic error.
            if (res.status === 500) {
                 setStatus("idle"); // allow retry
                 alert("Erro no servidor. Tente novamente.");
            } else {
                 // For rate limits or others
                 setStatus("success"); // fake it for security if needed, but let's stick to API response msg logic
                 setMessage(data.message || "Verifique sua caixa de entrada.");
            }
        }
    } catch (err) {
        setStatus("idle");
        alert("Erro de conexão.");
    }
  };

  return (
    <div className="container" style={{ maxWidth: '400px', marginTop: '60px' }}>
      <h1>Recuperar Senha</h1>
      <p className="subtitle" style={{ marginBottom: '20px' }}>
        Informe seu e-mail para receber as instruções de redefinição de senha.
      </p>

      {status === "success" ? (
        <div style={{ 
            backgroundColor: '#d1e7dd', 
            color: '#0f5132', 
            padding: '16px', 
            borderRadius: '8px',
            marginBottom: '16px',
            textAlign: 'center'
        }}>
            <p style={{ marginBottom: '10px' }}>{message}</p>
            <Link href="/login" style={{ color: '#0f5132', fontWeight: '500' }}>
                Voltar para o Login
            </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
            <div className="form-group" style={{ marginBottom: '16px' }}>
                <label htmlFor="email">Email</label>
                <div className="input-wrapper">
                    <input 
                        type="email" 
                        id="email" 
                        required 
                        placeholder="seu@email.com"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        disabled={status === "loading"}
                    />
                </div>
            </div>

            <button 
                type="submit" 
                className="btn-primary" 
                style={{ width: '100%', marginTop: '8px', marginBottom: '16px' }}
                disabled={status === "loading"}
            >
                {status === "loading" ? "Enviando..." : "Enviar Link de Recuperação"}
            </button>

            <div style={{ textAlign: 'center' }}>
                <Link href="/login" style={{ fontSize: '14px', color: 'var(--text-light)', textDecoration: 'none' }}>
                    Voltar para o Login
                </Link>
            </div>
        </form>
      )}
    </div>
  );
}
