// ========== MÁSCARAS DE FORMATAÇÃO ==========

// Máscara de Celular: (00) 00000-0000
const phoneMask = (value) => {
  return value
    .replace(/\D/g, '')
    .replace(/^(\d{2})(\d)/g, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .replace(/(-\d{4})\d+?$/, '$1');
};

// Máscara de CPF/CNPJ
const documentMask = (value) => {
  value = value.replace(/\D/g, '');
  
  if (value.length <= 11) {
    // CPF: 000.000.000-00
    return value
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  } else {
    // CNPJ: 00.000.000/0000-00
    return value
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .substring(0, 18);
  }
};

// Máscara de CEP: 00000-000
const cepMask = (value) => {
  return value
    .replace(/\D/g, '')
    .replace(/^(\d{5})(\d)/, '$1-$2')
    .replace(/(-\d{3})\d+?$/, '$1');
};

// ========== VALIDAÇÕES ==========

// Validar CPF
const validateCPF = (cpf) => {
  cpf = cpf.replace(/\D/g, '');
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

// Validar CNPJ
const validateCNPJ = (cnpj) => {
  cnpj = cnpj.replace(/\D/g, '');
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

// Validar e-mail
const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

// Validar nome completo (mínimo 2 palavras)
const validateFullName = (name) => {
  const words = name.trim().split(/\s+/);
  return words.length >= 2 && words.every(word => word.length >= 2);
};

// Validar telefone (11 dígitos)
const validatePhone = (phone) => {
  const digits = phone.replace(/\D/g, '');
  return digits.length === 11;
};

// Validar CEP (8 dígitos)
const validateCEP = (cep) => {
  const digits = cep.replace(/\D/g, '');
  return digits.length === 8;
};

// ========== APLICAR MÁSCARAS NOS INPUTS ==========

const phoneInput = document.getElementById('phone');
const documentInput = document.getElementById('document');
const cepInput = document.getElementById('cep');

phoneInput.addEventListener('input', (e) => {
  e.target.value = phoneMask(e.target.value);
});

documentInput.addEventListener('input', (e) => {
  e.target.value = documentMask(e.target.value);
});

cepInput.addEventListener('input', (e) => {
  e.target.value = cepMask(e.target.value);
});

// ========== VALIDAÇÃO EM TEMPO REAL ==========

const setFieldState = (fieldId, isValid, errorMessage = '') => {
  const field = document.getElementById(fieldId);
  const formGroup = field.closest('.form-group');
  const errorDiv = formGroup.querySelector('.error-message');
  
  formGroup.classList.remove('error', 'success');
  
  if (field.value.trim() === '') {
    // Campo vazio - sem validação
    if (errorDiv) errorDiv.textContent = '';
    return;
  }
  
  if (isValid) {
    formGroup.classList.add('success');
    if (errorDiv) errorDiv.textContent = '';
  } else {
    formGroup.classList.add('error');
    if (errorDiv) errorDiv.textContent = errorMessage;
  }
};

// Validação do Nome Completo
document.getElementById('fullName').addEventListener('blur', (e) => {
  const value = e.target.value.trim();
  if (value) {
    const isValid = validateFullName(value);
    setFieldState('fullName', isValid, 'Digite nome e sobrenome completos');
  }
});

// Validação do E-mail
document.getElementById('email').addEventListener('blur', (e) => {
  const value = e.target.value.trim();
  if (value) {
    const isValid = validateEmail(value);
    setFieldState('email', isValid, 'E-mail inválido');
    
    // Revalidar confirmação se já foi preenchida
    const confirmEmail = document.getElementById('confirmEmail');
    if (confirmEmail.value) {
      confirmEmail.dispatchEvent(new Event('blur'));
    }
  }
});

// Validação do Confirme o E-mail
document.getElementById('confirmEmail').addEventListener('blur', (e) => {
  const value = e.target.value.trim();
  const email = document.getElementById('email').value.trim();
  if (value) {
    const isValid = value === email && validateEmail(value);
    setFieldState('confirmEmail', isValid, 'Os e-mails não coincidem');
  }
});

// Validação do Celular
phoneInput.addEventListener('blur', (e) => {
  const value = e.target.value;
  if (value) {
    const isValid = validatePhone(value);
    setFieldState('phone', isValid, 'Celular inválido (11 dígitos)');
  }
});

// Validação do CPF/CNPJ
documentInput.addEventListener('blur', (e) => {
  const value = e.target.value;
  const digits = value.replace(/\D/g, '');
  
  if (value) {
    let isValid = false;
    let errorMsg = 'CPF/CNPJ inválido';
    
    if (digits.length === 11) {
      isValid = validateCPF(value);
      errorMsg = 'CPF inválido';
    } else if (digits.length === 14) {
      isValid = validateCNPJ(value);
      errorMsg = 'CNPJ inválido';
    }
    
    setFieldState('document', isValid, errorMsg);
  }
});

// Validação do CEP
cepInput.addEventListener('blur', (e) => {
  const value = e.target.value;
  if (value) {
    const isValid = validateCEP(value);
    setFieldState('cep', isValid, 'CEP inválido (8 dígitos)');
  }
});

// Validação do Nome da Empresa
document.getElementById('company').addEventListener('blur', (e) => {
  const value = e.target.value.trim();
  if (value) {
    const isValid = value.length >= 3;
    setFieldState('company', isValid, 'Nome da empresa muito curto');
  }
});


// ========== VALIDAÇÃO DO BOTÃO DE SUBMIT ==========

let isUserLoggedIn = false;

// Função para verificar se todos os campos estão válidos
const checkFormValidity = () => {
  const fullName = document.getElementById('fullName').value.trim();
  const email = document.getElementById('email').value.trim();
  const confirmEmail = document.getElementById('confirmEmail').value.trim();
  const phone = document.getElementById('phone').value;
  const documentValue = document.getElementById('document').value;
  const company = document.getElementById('company').value.trim();
  const cep = document.getElementById('cep').value;
  
  // Verificar se todos os campos estão preenchidos
  const allFieldsFilled = fullName && email && confirmEmail && phone && documentValue && company && cep;
  
  if (!allFieldsFilled) {
    return false;
  }
  
  // Verificar se todos os campos são válidos
  const isFullNameValid = validateFullName(fullName);
  const isEmailValid = validateEmail(email);
  const isConfirmEmailValid = email === confirmEmail && validateEmail(confirmEmail);
  const isPhoneValid = validatePhone(phone);
  
  const documentDigits = documentValue.replace(/\D/g, '');
  let isDocumentValid = false;
  if (documentDigits.length === 11) {
    isDocumentValid = validateCPF(documentValue);
  } else if (documentDigits.length === 14) {
    isDocumentValid = validateCNPJ(documentValue);
  }
  
  const isCepValid = validateCEP(cep);
  const isCompanyValid = company.length >= 3;
  
  const allValid = isFullNameValid && isEmailValid && isConfirmEmailValid && 
         isPhoneValid && isDocumentValid && isCepValid && isCompanyValid;
  
  return allValid;
};

// Função para atualizar o estado do botão
const updateSubmitButton = () => {
  const submitBtn = document.getElementById('submitBtn');
  const isFormValid = checkFormValidity();
  
  // Botão só fica habilitado se o formulário estiver válido E o usuário estiver logado
  if (isFormValid && isUserLoggedIn) {
    submitBtn.disabled = false;
  } else {
    submitBtn.disabled = true;
  }
};

// Adicionar listeners em todos os campos para verificar em tempo real
const formInputs = ['fullName', 'email', 'confirmEmail', 'phone', 'document', 'company', 'cep'];

formInputs.forEach(fieldId => {
  const field = document.getElementById(fieldId);
  field.addEventListener('input', updateSubmitButton);
  field.addEventListener('blur', updateSubmitButton);
});

// Inicializar botão como desabilitado
document.getElementById('submitBtn').disabled = true;

// ========== AUTENTICAÇÃO E FORMULÁRIO ==========

async function fetchMe() {
  const res = await fetch('/me');
  const data = await res.json();
  const logged = !!data.email;
  
  // Atualizar estado de login global
  isUserLoggedIn = logged;
  
  document.getElementById('not-logged').classList.toggle('hidden', logged);
  document.getElementById('loginBtn').style.display = logged ? 'none' : 'inline-block';
  document.getElementById('logged').classList.toggle('hidden', !logged);
  if (logged) document.getElementById('userEmail').textContent = data.email;
  
  // Atualizar estado do botão quando o status de login mudar
  updateSubmitButton();
}

document.getElementById('logoutBtn').addEventListener('click', async () => {
  try {
    const r = await fetch('/logout', { method: 'POST' });
    if (!r.ok) throw new Error('POST /logout falhou');
  } catch (e) {
    await fetch('/logout', { method: 'GET' });
  }
  await fetchMe();
});

document.getElementById('calForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  // Coletar TODOS os dados do formulário
  const fullName = document.getElementById('fullName').value.trim();
  const email = document.getElementById('email').value.trim();
  const confirmEmail = document.getElementById('confirmEmail').value.trim();
  const phone = document.getElementById('phone').value;
  const documentValue = document.getElementById('document').value;
  const companyName = document.getElementById('company').value.trim();
  const cep = document.getElementById('cep').value;
  const timeZone = document.getElementById('tz').value;
  
  const summary = companyName || 'Calendário do Cliente';
  document.getElementById('summary').value = summary;

  const formStatus = document.getElementById('formStatus');
  const toast = document.getElementById('toast');
  const submitBtn = document.getElementById('submitBtn');
  const btnSpinner = document.getElementById('btnSpinner');
  const btnText = document.getElementById('btnText');

  const showToast = (message, type = 'ok') => {
    toast.textContent = message;
    toast.className = 'toast ' + (type === 'ok' ? 'ok' : 'err') + ' show';
    clearTimeout(toast._hideTimer);
    toast._hideTimer = setTimeout(() => toast.classList.remove('show'), 3500);
  };

  formStatus.textContent = 'Enviando dados...';
  formStatus.className = 'status';
  formStatus.style.display = 'block';
  
  submitBtn.disabled = true;
  submitBtn.classList.add('btn-loading');
  btnSpinner.style.display = 'inline-block';
  btnText.textContent = 'Enviando...';

  // Preparar payload completo com TODOS os dados do formulário
  const payload = {
    fullName,
    email,
    phone,
    document: documentValue,
    companyName,
    cep,
    calendar: {
      summary,
      description: `Calendário de ${companyName}`,
      timeZone
    }
  };

  try {
    // Enviar para o webhook do n8n (rota /calendars)
    const res = await fetch('/calendars', { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify(payload) 
    });
    const data = await res.json();

    if (data.error || res.status >= 400) {
      // Formatar mensagem de erro baseada no tipo
      let errorMessage = data.error || 'Erro ao processar cadastro';
      let errorDetails = data.details || '';
      
      // Adicionar ícone baseado no tipo de erro
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
      
      // Exibir mensagem principal
      formStatus.textContent = `${icon} ${errorMessage}`;
      formStatus.className = 'status err';
      
      // Se houver detalhes, adicionar em uma segunda linha
      if (errorDetails && errorDetails !== errorMessage) {
        formStatus.innerHTML = `${icon} ${errorMessage}<br><small style="font-size: 0.9em; opacity: 0.9;">${errorDetails}</small>`;
      }
      
      // Toast com mensagem resumida
      showToast(`${icon} ${errorMessage}`, 'err');
      
      // Se for erro de autenticação, sugerir novo login
      if (data.errorType === 'AUTH_EXPIRED') {
        setTimeout(() => {
          if (confirm('Sua sessão expirou. Deseja fazer login novamente?')) {
            window.location.href = '/auth/google/initiate';
          }
        }, 2000);
      }
      
      console.error('❌ Erro na resposta:', data);
    } else {
      formStatus.textContent = 'Cadastro processado com sucesso!';
      formStatus.className = 'status ok';
      showToast('Cadastro criado com sucesso!', 'ok');

      // Se houver QR Code, redireciona
      const qrUrl = data.qrCodeUrl || data.qr_code || data.qrcode;
      
      if (qrUrl) {
        formStatus.textContent += ' Redirecionando...';
        setTimeout(() => {
          const params = new URLSearchParams({
            qr: qrUrl,
            company: companyName
          });
          window.location.href = `/qrcode.html?${params.toString()}`;
        }, 1500);
      } else {
        // Se não houver QR Code, apenas mostra sucesso
        formStatus.textContent = 'Cadastro criado com sucesso! Você receberá instruções por email.';
      }
    }
  } catch (err) {
    console.error('❌ Erro ao enviar:', err);
    
    // Tratar erros de rede
    let errorMessage = 'Erro de conexão';
    let errorDetails = 'Não foi possível conectar ao servidor. Verifique sua conexão com a internet.';
    
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      errorMessage = 'Servidor indisponível';
      errorDetails = 'O servidor não está respondendo. Tente novamente em alguns instantes.';
    }
    
    formStatus.innerHTML = `🔌 ${errorMessage}<br><small style="font-size: 0.9em; opacity: 0.9;">${errorDetails}</small>`;
    formStatus.className = 'status err';
    showToast(`🔌 ${errorMessage}`, 'err');
  } finally {
    submitBtn.disabled = false;
    submitBtn.classList.remove('btn-loading');
    btnSpinner.style.display = 'none';
    btnText.textContent = 'Criar cadastro';
  }
});

fetchMe();
