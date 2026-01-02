"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [isRegistering, setIsRegistering] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (isRegistering && formData.password !== formData.confirmPassword) {
        setError("As senhas não conferem.");
        setLoading(false);
        return;
    }

    const endpoint = isRegistering ? "/api/auth/register" : "/api/auth/login";
    
    try {
        const res = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: formData.email, password: formData.password })
        });
        const data = await res.json();

        if (res.ok) {
            router.push("/");
            router.refresh(); 
        } else {
            setError(data.error || "Ocorreu um erro.");
        }
    } catch (err) {
        setError("Erro de conexão. Tente novamente.");
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: '400px', marginTop: '60px' }}>
      <h1>{isRegistering ? "Criar Conta" : "Login"}</h1>
      <p className="subtitle" style={{ marginBottom: '20px' }}>
        {isRegistering ? "Preencha os dados para se cadastrar" : "Entre para acessar seus calendários"}
      </p>

      {error && (
        <div style={{ 
            backgroundColor: 'var(--error-bg)', 
            color: 'var(--error)', 
            padding: '12px', 
            borderRadius: '8px',
            marginBottom: '16px',
            fontSize: '14px',
            border: '1px solid #fecaca'
        }}>
            {error}
        </div>
      )}

      <div className="auth-section">
        <form onSubmit={handleSubmit}>
            <div className="form-group" style={{ marginBottom: '16px' }}>
                <label htmlFor="email">Email</label>
                <div className="input-wrapper">
                    <input 
                        type="email" 
                        id="email" 
                        required 
                        placeholder="seu@email.com"
                        value={formData.email}
                        onChange={e => setFormData({...formData, email: e.target.value})}
                    />
                </div>
            </div>

            <div className="form-group" style={{ marginBottom: '16px' }}>
                <label htmlFor="password">Senha</label>
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

            {isRegistering && (
                <div className="form-group" style={{ marginBottom: '16px' }}>
                    <label htmlFor="confirmPassword">Confirmar Senha</label>
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
            )}

            <button 
                type="submit" 
                className="btn-primary" 
                style={{ width: '100%', marginTop: '8px', marginBottom: '16px' }}
                disabled={loading}
            >
                {loading ? "Processando..." : (isRegistering ? "Cadastrar" : "Entrar")}
            </button>
        </form>

        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <span style={{ fontSize: '14px', color: 'var(--text-light)' }}>
                {isRegistering ? "Já tem uma conta?" : "Não tem conta ainda?"}
            </span>{" "}
            <button 
                className="btn-secondary" 
                style={{ padding: '4px 8px', fontSize: '13px' }}
                onClick={() => {
                    setIsRegistering(!isRegistering);
                    setError("");
                }}
            >
                {isRegistering ? "Fazer Login" : "Cadastre-se"}
            </button>
        </div>



      <div className="separator" style={{ 
          display: 'flex', 
          alignItems: 'center', 
          textAlign: 'center', 
          margin: '20px 0',
          color: 'var(--text-light)',
          fontSize: '14px'
      }}>
          <span style={{ flex: 1, borderBottom: '1px solid var(--border)' }}></span>
          <span style={{ margin: '0 10px' }}>OU</span>
          <span style={{ flex: 1, borderBottom: '1px solid var(--border)' }}></span>
      </div>

      <button
          onClick={() => window.location.href = '/api/auth/google/initiate'}
          style={{
              width: '100%',
              padding: '10px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              backgroundColor: 'white',
              color: 'var(--text)',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              transition: 'all 0.2s'
          }}
      >
          <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Entrar com Google
      </button>
      </div>
    </div>
  );
}
