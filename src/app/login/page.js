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


      </div>
    </div>
  );
}
