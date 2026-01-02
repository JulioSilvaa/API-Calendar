"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [formData, setFormData] = useState({ password: "", confirmPassword: "" });
  const [status, setStatus] = useState("idle"); // idle, loading, success, error
  const [message, setMessage] = useState("");

  if (!token) {
      return (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--error)' }}>
              Token de recuperação inválido ou ausente.
              <br />
              <Link href="/forgot-password" style={{ color: 'var(--primary)', marginTop: '10px', display: 'inline-block' }}>
                  Solicitar novamente
              </Link>
          </div>
      );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
        setStatus("error");
        setMessage("As senhas não conferem.");
        return;
    }

    setStatus("loading");
    
    try {
        const res = await fetch("/api/auth/reset-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token, password: formData.password })
        });
        
        const data = await res.json();
        
        if (res.ok) {
            setStatus("success");
            setMessage("Sua senha foi redefinida com sucesso!");
            setTimeout(() => {
                router.push("/login"); // Optional auto-redirect
            }, 3000);
        } else {
            setStatus("error");
            setMessage(data.error || "Erro ao redefinir senha.");
        }
    } catch (err) {
        setStatus("error");
        setMessage("Erro de conexão.");
    }
  };

  return (
    <>
      {status === "success" ? (
        <div style={{ 
            backgroundColor: '#d1e7dd', 
            color: '#0f5132', 
            padding: '16px', 
            borderRadius: '8px',
            textAlign: 'center'
        }}>
            <h3 style={{ marginBottom: '10px' }}>Sucesso!</h3>
            <p style={{ marginBottom: '20px' }}>{message}</p>
            <Link href="/login" className="btn-primary" style={{ textDecoration: 'none', display: 'inline-block', padding: '10px 20px' }}>
                Ir para o Login
            </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
            {status === "error" && (
                 <div style={{ 
                    backgroundColor: 'var(--error-bg)', 
                    color: 'var(--error)', 
                    padding: '10px', 
                    borderRadius: '4px',
                    marginBottom: '16px',
                    fontSize: '14px'
                }}>
                    {message}
                </div>
            )}

            <div className="form-group" style={{ marginBottom: '16px' }}>
                <label htmlFor="password">Nova Senha</label>
                <div className="input-wrapper">
                    <input 
                        type="password" 
                        id="password" 
                        required 
                        placeholder="••••••••"
                        minLength={6}
                        value={formData.password}
                        onChange={e => setFormData({...formData, password: e.target.value})}
                    />
                </div>
            </div>

            <div className="form-group" style={{ marginBottom: '20px' }}>
                <label htmlFor="confirmPassword">Confirmar Nova Senha</label>
                <div className="input-wrapper">
                    <input 
                        type="password" 
                        id="confirmPassword" 
                        required 
                        placeholder="••••••••"
                        value={formData.confirmPassword}
                        onChange={e => setFormData({...formData, confirmPassword: e.target.value})}
                    />
                </div>
            </div>

            <button 
                type="submit" 
                className="btn-primary" 
                style={{ width: '100%', marginBottom: '16px' }}
                disabled={status === "loading"}
            >
                {status === "loading" ? "Redefinindo..." : "Redefinir Senha"}
            </button>
        </form>
      )}
    </>
  );
}

export default function ResetPasswordPage() {
    return (
        <div className="container" style={{ maxWidth: '400px', marginTop: '60px' }}>
          <h1>Definir Nova Senha</h1>
          <p className="subtitle" style={{ marginBottom: '20px' }}>
            Digite sua nova senha abaixo.
          </p>
          <Suspense fallback={<div>Carregando...</div>}>
            <ResetPasswordContent />
          </Suspense>
        </div>
    );
}
