"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

// --- Validations & Masks ---

const phoneMask = (value) => {
  return value
    .replace(/\D/g, "")
    .replace(/^(\d{2})(\d)/g, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2")
    .replace(/(-\d{4})\d+?$/, "$1");
};

const documentMask = (value) => {
  value = value.replace(/\D/g, "");

  if (value.length <= 11) {
    return value
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  } else {
    return value
      .replace(/^(\d{2})(\d)/, "$1.$2")
      .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1/$2")
      .replace(/(\d{4})(\d)/, "$1-$2")
      .substring(0, 18);
  }
};

const cepMask = (value) => {
  return value
    .replace(/\D/g, "")
    .replace(/^(\d{5})(\d)/, "$1-$2")
    .replace(/(-\d{3})\d+?$/, "$1");
};

const validateCPF = (cpf) => {
  cpf = cpf.replace(/\D/g, "");
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(cpf.charAt(i)) * (10 - i);
  let rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(cpf.charAt(9))) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(cpf.charAt(i)) * (11 - i);
  rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(cpf.charAt(10))) return false;

  return true;
};

const validateCNPJ = (cnpj) => {
  cnpj = cnpj.replace(/\D/g, "");
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;

  let length = cnpj.length - 2;
  let numbers = cnpj.substring(0, length);
  let digits = cnpj.substring(length);
  let sum = 0;
  let pos = length - 7;

  for (let i = length; i >= 1; i--) {
    sum += numbers.charAt(length - i) * pos--;
    if (pos < 2) pos = 9;
  }

  let result = sum % 11 < 2 ? 0 : 11 - sum % 11;
  if (result != digits.charAt(0)) return false;

  length = length + 1;
  numbers = cnpj.substring(0, length);
  sum = 0;
  pos = length - 7;

  for (let i = length; i >= 1; i--) {
    sum += numbers.charAt(length - i) * pos--;
    if (pos < 2) pos = 9;
  }

  result = sum % 11 < 2 ? 0 : 11 - sum % 11;
  if (result != digits.charAt(1)) return false;

  return true;
};

const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

const validateFullName = (name) => {
  const words = name.trim().split(/\s+/);
  return words.length >= 2 && words.every((word) => word.length >= 2);
};

const validatePhone = (phone) => {
  const digits = phone.replace(/\D/g, "");
  return digits.length === 11;
};

const validateCEP = (cep) => {
  const digits = cep.replace(/\D/g, "");
  return digits.length === 8;
};

export default function RegistrationForm({ initialUserEmail }) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    document: "",
    company: "",
    cep: "",
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
    tz: "America/Sao_Paulo",
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isUserLoggedIn, setIsUserLoggedIn] = useState(!!initialUserEmail);
  const [userEmail, setUserEmail] = useState(initialUserEmail || "");
  const [loadingCep, setLoadingCep] = useState(false);
  const [addressFound, setAddressFound] = useState(false);
  const [submitStatus, setSubmitStatus] = useState({ type: "", message: "", details: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState({ show: false, message: "", type: "ok" });
  const [hasTokens, setHasTokens] = useState(false);
  const [userAvatar, setUserAvatar] = useState(null);
  const [connectedGoogleEmail, setConnectedGoogleEmail] = useState(null);

  useEffect(() => {
    fetchMe();
  }, []);

  const fetchMe = async () => {
    try {
      const res = await fetch("/api/me");
      const data = await res.json();
      if (data.email) {
        setIsUserLoggedIn(true);
        setUserEmail(data.email);
        setHasTokens(data.hasTokens);
        setUserAvatar(data.avatarUrl);
        setConnectedGoogleEmail(data.googleEmail);
        
        // Pre-fill email with logged in user email
        setFormData(prev => ({ 
            ...prev, 
            email: data.email
        }));
      } else {
        setIsUserLoggedIn(false);
        setUserEmail("");
        setHasTokens(false);
        setUserAvatar(null);
        setConnectedGoogleEmail(null);
      }
    } catch (err) {
      console.error("Failed to fetch user session", err);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/logout", { method: "POST" });
    } catch (e) {
      await fetch("/api/logout", { method: "GET" });
    }
    // Refresh page to clear server state
    window.location.reload(); 
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    let newValue = value;

    if (name === "phone") newValue = phoneMask(value);
    if (name === "document") newValue = documentMask(value);
    if (name === "cep") {
      newValue = cepMask(value);
      if (newValue.replace(/\D/g, "").length === 8) {
        fetchAddressByCEP(newValue);
      }
    }

    setFormData((prev) => ({ ...prev, [name]: newValue }));
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    validateField(name, value);
  };

  const validateField = (name, value) => {
    let error = "";
    const cleanValue = value.trim();

    switch (name) {
      case "fullName":
        if (!validateFullName(cleanValue)) error = "Digite nome e sobrenome completos";
        break;
      case "email":
        if (!validateEmail(cleanValue)) error = "E-mail inválido";
        break;

      case "phone":
        if (!validatePhone(cleanValue)) error = "Celular inválido (11 dígitos)";
        break;
      case "document":
        const digits = cleanValue.replace(/\D/g, "");
        if (digits.length === 11) {
          if (!validateCPF(cleanValue)) error = "CPF inválido";
        } else if (digits.length === 14) {
          if (!validateCNPJ(cleanValue)) error = "CNPJ inválido";
        } else {
          error = "CPF/CNPJ inválido";
        }
        break;
      case "cep":
        if (!validateCEP(cleanValue)) error = "CEP inválido (8 dígitos)";
        break;
      case "company":
        if (cleanValue.length < 3) error = "Nome da empresa muito curto";
        break;
      default:
        break;
    }

    setErrors((prev) => ({ ...prev, [name]: error }));
  };

  const fetchAddressByCEP = async (cep) => {
    const cleanCEP = cep.replace(/\D/g, "");
    setLoadingCep(true);
    setErrors((prev) => ({ ...prev, cep: "" })); // Clear previous errors

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);
      const data = await response.json();

      if (data.erro) {
        setErrors((prev) => ({ ...prev, cep: "CEP não encontrado" }));
        setAddressFound(false);
        setFormData((prev) => ({
          ...prev,
          street: "",
          neighborhood: "",
          city: "",
          state: "",
          number: "",
          complement: "",
        }));
      } else {
        setFormData((prev) => ({
          ...prev,
          street: data.logradouro || "",
          neighborhood: data.bairro || "",
          city: data.localidade || "",
          state: data.uf || "",
        }));
        setAddressFound(true);
      }
    } catch (error) {
      console.error("Erro ao buscar CEP:", error);
      setErrors((prev) => ({ ...prev, cep: "Erro ao buscar CEP. Tente novamente." }));
      setAddressFound(false);
    } finally {
      setLoadingCep(false);
    }
  };

  const isFormValid = () => {
    // Check all required fields have values and no errors
    const requiredFields = [
      "fullName",
      "email",
      "phone",
      "document",
      "company",
      "cep",
      "street",
      "neighborhood",
      "city",
      "state",
      "number",
    ];

    for (const field of requiredFields) {
      if (!formData[field]) return false;
      if (errors[field]) return false;
    }
    return true;
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    // User is guaranteed logged in by server check
    
    setSubmitStatus({ type: "info", message: "Enviando dados..." });

    setIsSubmitting(true);

    const payload = {
      fullName: formData.fullName,
      email: formData.email,
      phone: formData.phone,
      document: formData.document,
      companyName: formData.company,
      address: {
        cep: formData.cep,
        street: formData.street,
        number: formData.number,
        complement: formData.complement || "",
        neighborhood: formData.neighborhood,
        city: formData.city,
        state: formData.state,
      },
      calendar: {
        summary: formData.company || "Calendário do Cliente",
        description: `Calendário de ${formData.company}`,
        timeZone: formData.tz,
      },
    };

    try {
      const res = await fetch("/api/calendars", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.error || res.status >= 400) {
         let errorMessage = data.error || 'Erro ao processar cadastro';
         let errorDetails = data.details || '';
         const errorIcons = {
            'AUTH_EXPIRED': '🔒',
            'PERMISSION_DENIED': '⛔',
            'TIMEOUT': '⏱️',
            'CONNECTION_ERROR': '🔌',
            'N8N_WORKFLOW_ERROR': '⚙️',
            'VALIDATION_ERROR': '📝',
            'CLIENT_ERROR': '❌',
            'UNKNOWN_ERROR': '⚠️'
          };
          const icon = errorIcons[data.errorType] || '❌';

          setSubmitStatus({
            type: "err",
            message: `${icon} ${errorMessage}`,
            details: errorDetails !== errorMessage ? errorDetails : ""
          });
          showToast(`${icon} ${errorMessage}`, "err");

           if (data.errorType === 'AUTH_EXPIRED') {
            setTimeout(() => {
              if (confirm('Sua sessão expirou. Deseja fazer login novamente?')) {
                window.location.href = '/api/auth/google/initiate';
              }
            }, 2000);
          }

      } else {
        setSubmitStatus({ type: "ok", message: "Cadastro processado com sucesso!" });
        showToast("Cadastro criado com sucesso!", "ok");

        const qrUrl = data.qrCodeUrl || data.qr_code || data.qrcode;
        if (qrUrl) {
            setSubmitStatus(prev => ({ ...prev, message: prev.message + " Redirecionando..." }));
            setTimeout(() => {
                const params = new URLSearchParams({
                  qr: qrUrl,
                  company: formData.company
                });
                router.push(`/qrcode?${params.toString()}`);
            }, 1500);
        } else {
            setSubmitStatus(prev => ({ ...prev, message: "Cadastro criado com sucesso! Você receberá instruções por email." }));
        }
      }
    } catch (err) {
        let errorMessage = 'Erro de conexão';
        let errorDetails = 'Não foi possível conectar ao servidor. Verifique sua conexão com a internet.';
        
        setSubmitStatus({
            type: "err",
            message: `🔌 ${errorMessage}`,
            details: errorDetails
        });
        showToast(`🔌 ${errorMessage}`, "err");
    } finally {
      setIsSubmitting(false);
    }
  };

  const showToast = (message, type) => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "ok" }), 3500);
  };

  const getGroupClass = (fieldName) => {
    const classes = ["form-group"];
    if (touched[fieldName]) {
        if (errors[fieldName]) classes.push("error");
        else if (formData[fieldName]) classes.push("success");
    }
    return classes.join(" ");
  };

  return (
    <>
      <div
        id="toast"
        className={`toast ${toast.type} ${toast.show ? "show" : ""}`}
        role="status"
        aria-live="polite"
      >
        {toast.message}
      </div>

      <div className="container">
        <h1>OS SEUS DADOS</h1>
        <p className="subtitle">Preencha os campos abaixo para completar seu cadastro</p>


        {/* Form Section */}
        <div className="form-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2>Dados do Cadastro</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {/* STATE 1: Logged in but needs to connect Google */}
                {isUserLoggedIn && !hasTokens && (
                    <>
                        <button 
                            type="button"
                            onClick={() => window.location.href = '/api/auth/google/initiate'}
                            style={{ 
                                background: 'white', 
                                border: '1px solid #dadce0', 
                                borderRadius: '4px',
                                color: '#3c4043', 
                                cursor: 'pointer', 
                                padding: '8px 12px', 
                                fontSize: '13px',
                                fontWeight: '500',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                transition: 'background 0.2s'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.background = '#f8f9fa'}
                            onMouseOut={(e) => e.currentTarget.style.background = 'white'}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            Conectar Google Agenda
                        </button>
                        <button 
                            onClick={handleLogout} 
                            type="button"
                            style={{ 
                                background: 'none', 
                                border: '1px solid #dadce0', 
                                borderRadius: '4px',
                                color: '#5f6368', 
                                cursor: 'pointer', 
                                padding: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s'
                            }}
                            title="Sair"
                            onMouseOver={(e) => { e.currentTarget.style.background = '#f1f3f4'; e.currentTarget.style.borderColor = '#d2e3fc'; }}
                            onMouseOut={(e) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.borderColor = '#dadce0'; }}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                                <polyline points="16 17 21 12 16 7"></polyline>
                                <line x1="21" y1="12" x2="9" y2="12"></line>
                            </svg>
                        </button>
                    </>
                )}

                {/* STATE 2: Connected Badge */}
                {isUserLoggedIn && hasTokens && (
                    <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '12px', 
                        background: '#f8f9fa', 
                        padding: '6px 8px 6px 6px', 
                        borderRadius: '30px', 
                        border: '1px solid #e8eaed',
                        boxShadow: '0 1px 2px rgba(60,64,67,0.05)'
                    }}>
                        {/* Avatar */}
                        {userAvatar ? (
                           <img 
                              src={userAvatar} 
                              alt="Profile" 
                              style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} 
                           />
                        ) : (
                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#1a73e8', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold' }}>
                                {formData.fullName ? formData.fullName.charAt(0).toUpperCase() : 'U'}
                            </div>
                        )}
                        
                        {/* Info */}
                        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: '1.2', alignItems: 'flex-start', paddingRight: '4px' }}>
                            <span style={{ fontSize: '11px', color: '#1a73e8', fontWeight: '700', letterSpacing: '0.3px', textTransform: 'uppercase' }}>Conectado</span>
                            <span style={{ fontSize: '12px', color: '#3c4043', fontWeight: '500', maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {connectedGoogleEmail || formData.email || 'Conta Google'}
                            </span>
                        </div>

                        {/* Divider */}
                        <div style={{ width: '1px', height: '24px', background: '#dadce0', margin: '0 2px' }}></div>

                        {/* Logout */}
                        <button 
                            onClick={handleLogout} 
                            type="button"
                            style={{ 
                                background: 'transparent', 
                                border: 'none', 
                                color: '#5f6368', 
                                cursor: 'pointer', 
                                padding: '6px',
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                borderRadius: '50%',
                                transition: 'background 0.2s'
                            }}
                            title="Desconectar"
                            onMouseOver={(e) => { e.currentTarget.style.background = '#e8eaed'; e.currentTarget.style.color = '#202124'; }}
                            onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#5f6368'; }}
                        >
                             <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                                <polyline points="16 17 21 12 16 7"></polyline>
                                <line x1="21" y1="12" x2="9" y2="12"></line>
                            </svg>
                        </button>
                    </div>
                )}
              </div>
          </div>

          <form id="calForm" onSubmit={handleSubmit}>
            {/* Nome e sobrenome */}
            <div className="form-row">
              <div className={getGroupClass("fullName")}>
                <label htmlFor="fullName">Nome e sobrenome</label>
                <div className="input-wrapper">
                  <input
                    type="text"
                    id="fullName"
                    name="fullName"
                    placeholder="Digite seu nome completo"
                    required
                    value={formData.fullName}
                    onChange={handleChange}
                    onBlur={handleBlur}
                  />
                </div>
                <div className="error-message">{errors.fullName}</div>
              </div>
            </div>

            {/* E-mail */}
            <div className="form-row">
              <div className={getGroupClass("email")}>
                <label htmlFor="email">E-mail</label>
                <div className="input-wrapper">
                  <input
                    type="email"
                    id="email"
                    name="email"
                    placeholder="seu@email.com"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    readOnly={isUserLoggedIn}
                    style={isUserLoggedIn ? { backgroundColor: "#f0f0f0", cursor: "not-allowed", color: "#666" } : {}}
                  />
                  {isUserLoggedIn && (
                    <span style={{ 
                      position: 'absolute', 
                      right: '12px', 
                      top: '50%', 
                      transform: 'translateY(-50%)', 
                      pointerEvents: 'none',
                      display: 'flex',
                      color: '#6c757d',
                      opacity: 0.7
                    }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                      </svg>
                    </span>
                  )}
                </div>
                <div className="error-message">{errors.email}</div>
              </div>
            </div>

            {/* Google Login Trigger */}
            {(!isUserLoggedIn || (formData.email && formData.email !== userEmail)) && (
                <div className="form-row" style={{ marginTop: '-15px', marginBottom: '20px' }}>
                     <div className="form-group" style={{ width: '100%' }}>
                        <div className="info-box" style={{ 
                            backgroundColor: '#f8f9fa', 
                            border: '1px solid #e9ecef', 
                            borderRadius: '8px', 
                            padding: '15px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '15px'
                        }}>
                            <div style={{ flex: 1 }}>
                                <p style={{ margin: 0, fontSize: '14px', color: '#495057' }}>
                                    {isUserLoggedIn 
                                        ? `Deseja usar a conta ${formData.email || '...'}? Conecte-se para permitir o acesso ao calendário.`
                                        : "Para integrarmos seu calendário, precisamos que faça login com Google."}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => window.location.href = '/api/auth/google/initiate'}
                                style={{
                                    backgroundColor: 'white',
                                    border: '1px solid #ced4da',
                                    borderRadius: '6px',
                                    padding: '8px 16px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    cursor: 'pointer',
                                    fontSize: '13px',
                                    fontWeight: '500',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
                                Conectar com Google
                            </button>
                        </div>
                     </div>
                </div>
            )}

            {/* Celular e CPF/CNPJ */}
            <div className="form-row two-cols">
              <div className={getGroupClass("phone")}>
                <label htmlFor="phone">Celular</label>
                <div className="input-wrapper phone-input">
                  <span className="flag">🇧🇷</span>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    placeholder="(00) 00000-0000"
                    required
                    value={formData.phone}
                    onChange={handleChange}
                    onBlur={handleBlur}
                  />
                </div>
                <div className="error-message">{errors.phone}</div>
              </div>
              <div className={getGroupClass("document")}>
                <label htmlFor="document">CPF / CNPJ</label>
                <div className="input-wrapper">
                  <input
                    type="text"
                    id="document"
                    name="document"
                    placeholder="000.000.000-00"
                    required
                    value={formData.document}
                    onChange={handleChange}
                    onBlur={handleBlur}
                  />
                </div>
                <div className="error-message">{errors.document}</div>
              </div>
            </div>

            {/* Nome da Empresa */}
            <div className="form-row">
              <div className={getGroupClass("company")}>
                <label htmlFor="company">Nome da Empresa</label>
                <div className="input-wrapper">
                  <input
                    type="text"
                    id="company"
                    name="company"
                    placeholder="Ex.: Empresa XYZ"
                    required
                    value={formData.company}
                    onChange={handleChange}
                    onBlur={handleBlur}
                  />
                </div>
                <div className="error-message">{errors.company}</div>
              </div>
            </div>

            {/* CEP */}
            <div className="form-row">
              <div className={`form-group ${loadingCep ? "loading" : ""} ${touched.cep ? (errors.cep ? "error" : "success") : ""}`}>
                <label htmlFor="cep">CEP</label>
                <div className="input-wrapper">
                  <input
                    type="text"
                    id="cep"
                    name="cep"
                    placeholder="00000-000"
                    required
                    value={formData.cep}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    disabled={loadingCep}
                  />
                </div>
                <div className="error-message">{loadingCep ? "🔍 Buscando endereço..." : errors.cep}</div>
              </div>
            </div>

            {/* Endereço (Rua) */}
            {(addressFound || formData.street) && (
              <>
                <div className="form-row" id="streetRow">
                  <div className="form-group success">
                    <label htmlFor="street">Endereço (Rua)</label>
                    <div className="input-wrapper">
                      <input
                        type="text"
                        id="street"
                        name="street"
                        placeholder="Rua, Avenida, etc."
                        required
                        readOnly
                        value={formData.street}
                      />
                    </div>
                  </div>
                </div>

                {/* Número e Complemento */}
                <div className="form-row two-cols" id="numberRow">
                  <div className={getGroupClass("number")}>
                    <label htmlFor="number">Número</label>
                    <div className="input-wrapper">
                      <input
                        type="text"
                        id="number"
                        name="number"
                        placeholder="Ex.: 123"
                        required
                        value={formData.number}
                        onChange={handleChange}
                        onBlur={handleBlur}
                      />
                    </div>
                    <div className="error-message">{errors.number}</div>
                  </div>
                  <div className="form-group">
                    <label htmlFor="complement">Complemento</label>
                    <div className="input-wrapper">
                      <input
                        type="text"
                        id="complement"
                        name="complement"
                        placeholder="Apto, Sala, etc. (opcional)"
                        value={formData.complement}
                        onChange={handleChange}
                        onBlur={handleBlur}
                      />
                    </div>
                  </div>
                </div>

                {/* Bairro e Cidade */}
                <div className="form-row two-cols" id="cityRow">
                  <div className="form-group success">
                    <label htmlFor="neighborhood">Bairro</label>
                    <div className="input-wrapper">
                      <input
                        type="text"
                        id="neighborhood"
                        name="neighborhood"
                        placeholder="Bairro"
                        required
                        readOnly
                        value={formData.neighborhood}
                      />
                    </div>
                  </div>
                  <div className="form-group success">
                    <label htmlFor="city">Cidade</label>
                    <div className="input-wrapper">
                      <input
                        type="text"
                        id="city"
                        name="city"
                        placeholder="Cidade"
                        required
                        readOnly
                        value={formData.city}
                      />
                    </div>
                  </div>
                </div>

                {/* Estado */}
                <div className="form-row" id="stateRow">
                  <div className="form-group success">
                    <label htmlFor="state">Estado</label>
                    <div className="input-wrapper">
                      <input
                        type="text"
                        id="state"
                        name="state"
                        placeholder="UF"
                        required
                        readOnly
                        value={formData.state}
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Submit */}
            <div className="submit-wrapper">
              <button
                type="submit"
                id="submitBtn"
                className={`btn-primary ${isSubmitting ? "btn-loading" : ""}`}
                disabled={!isUserLoggedIn || !isFormValid() || isSubmitting}
              >
                <span id="btnSpinner" className="spinner" aria-hidden="true"></span>
                <span id="btnText">{isSubmitting ? "Enviando..." : "Criar cadastro"}</span>
              </button>
              {submitStatus.message && (
                <div
                  id="formStatus"
                  className={`status ${submitStatus.type}`}
                  role="status"
                  aria-live="polite"
                  style={{display: 'block'}}
                >
                    {submitStatus.message}
                    {submitStatus.details && <><br /><small style={{fontSize: "0.9em", opacity: 0.9}}>{submitStatus.details}</small></>}
                </div>
              )}
            </div>
          </form>
        </div>

        {/* Footer com links legais */}
        <footer className="legal-footer">
          <div className="legal-links">
            <a href="/terms" className="footer-link">
              Termos de Uso
            </a>
            <span className="separator">•</span>
            <a href="/privacy" className="footer-link">
              Política de Privacidade
            </a>
          </div>
        </footer>
      </div>
    </>
  );
}
