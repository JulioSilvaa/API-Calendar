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

// Remover estado de erro inicial do campo fullName (era apenas demonstração)
document.addEventListener('DOMContentLoaded', () => {
  const fullNameGroup = document.getElementById('fullName').closest('.form-group');
  // Mantém a classe error apenas se o usuário não interagiu ainda
  // Será removida quando o usuário começar a digitar
  document.getElementById('fullName').addEventListener('input', function() {
    if (this.value.trim() !== '') {
      fullNameGroup.classList.remove('error');
    }
  }, { once: true });
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
    console.log('❌ Campos não preenchidos:', {
      fullName: !!fullName,
      email: !!email,
      confirmEmail: !!confirmEmail,
      phone: !!phone,
      document: !!documentValue,
      company: !!company,
      cep: !!cep
    });
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
  
  // Debug: mostrar status de cada validação
  console.log('🔍 Status das validações:', {
    fullName: isFullNameValid,
    email: isEmailValid,
    confirmEmail: isConfirmEmailValid,
    phone: isPhoneValid,
    document: isDocumentValid,
    cep: isCepValid,
    company: isCompanyValid,
    userLoggedIn: isUserLoggedIn
  });
  
  const allValid = isFullNameValid && isEmailValid && isConfirmEmailValid && 
         isPhoneValid && isDocumentValid && isCepValid && isCompanyValid;
  
  if (allValid) {
    console.log('✅ Todos os campos válidos!');
  } else {
    console.log('❌ Alguns campos inválidos');
  }
  
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
  const companyName = document.getElementById('company').value.trim();
  const summary = companyName || 'Calendário do Cliente';
  document.getElementById('summary').value = summary;
  const description = '';
  const timeZone = document.getElementById('tz').value;

  const formStatus = document.getElementById('formStatus');
  const qrSection = document.getElementById('qrSection');
  const qrImg = document.getElementById('qrImg');
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

  formStatus.textContent = 'Enviando...';
  formStatus.className = 'status';
  formStatus.style.display = 'block';
  
  if (window._qrRefreshTimer) {
    clearInterval(window._qrRefreshTimer);
    window._qrRefreshTimer = null;
    window._currentQrUrl = null;
  }
  qrSection.style.display = 'none';
  qrSection.classList.remove('ready');
  
  submitBtn.disabled = true;
  submitBtn.classList.add('btn-loading');
  btnSpinner.style.display = 'inline-block';
  btnText.textContent = 'Enviando...';

  const body = { calendar: { summary, description, timeZone }, companyName };
  try {
    const res = await fetch('/calendars', { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify(body) 
    });
    const data = await res.json();

    if (data.error || data.message === 'Error in workflow' || res.status >= 400) {
      formStatus.textContent = data.error || data.message || 'Falha ao criar o calendário.';
      formStatus.className = 'status err';
    } else {
      formStatus.textContent = 'Calendário criado com sucesso';
      formStatus.className = 'status ok';
      showToast('Calendário criado com sucesso', 'ok');
    }

    const qrUrl = data.qrCodeUrl || (data.n8n && (data.n8n.qrCodeUrl || (data.n8n.data && data.n8n.data.qrCodeUrl)));
    if (qrUrl) {
      qrImg.src = qrUrl;
      qrSection.style.display = 'flex';
      qrSection.classList.add('ready');
      showToast('QR Code pronto para leitura', 'ok');
      console.log('QR exibido:', qrUrl);

      if (window._qrRefreshTimer) { clearInterval(window._qrRefreshTimer); window._qrRefreshTimer = null; }
      if (window._qrCheckTimer) { clearInterval(window._qrCheckTimer); window._qrCheckTimer = null; }
      if (window._qrCountdownTimer) { clearInterval(window._qrCountdownTimer); window._qrCountdownTimer = null; }

      window._currentQrUrl = qrUrl;
      let qrTimeLeft = 60;
      const qrTimerDiv = document.getElementById('qrTimer');
      qrTimerDiv.textContent = `QR será renovado em ${qrTimeLeft} segundos`;
      window._qrCountdownTimer = setInterval(() => {
        qrTimeLeft--;
        if (qrTimeLeft <= 0) qrTimeLeft = 0;
        qrTimerDiv.textContent = `QR será renovado em ${qrTimeLeft} segundos`;
      }, 1000);

      window._qrRefreshTimer = setInterval(() => {
        try {
          qrTimeLeft = 60;
          qrTimerDiv.textContent = `QR será renovado em ${qrTimeLeft} segundos`;
          if (window._currentQrUrl.startsWith('data:')) {
            qrImg.src = window._currentQrUrl;
          } else {
            let url = window._currentQrUrl.replace(/[&?]t=\d{13,}/, '');
            url = url.replace(/[?&]$/, '');
            qrImg.src = url + (url.includes('?') ? '&' : '?') + 't=' + Date.now();
          }
        } catch (e) {}
      }, 60 * 1000);

      // Verificar status de conexão a cada 4 segundos
      window._qrCheckTimer = setInterval(async () => {
        try {
          const resp = await fetch('/check-connection', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ companyName })
          });
          const result = await resp.json();
          if (result.connected) {
            clearInterval(window._qrRefreshTimer);
            clearInterval(window._qrCheckTimer);
            clearInterval(window._qrCountdownTimer);
            qrSection.style.display = 'none';
            showToast('WhatsApp conectado com sucesso! ✅', 'ok');
            formStatus.textContent = 'WhatsApp conectado com sucesso! ✅';
            formStatus.className = 'status ok';
          }
        } catch (e) {
          // Silenciosamente ignora erros de conexão
          console.log('Verificando conexão...');
        }
      }, 4000);
    } else {
      qrSection.style.display = 'none';
    }

    console.log('Resposta /calendars:', data);
  } catch (err) {
    formStatus.textContent = 'Erro: ' + err.message;
    formStatus.className = 'status err';
    showToast(formStatus.textContent, 'err');
  } finally {
    submitBtn.disabled = false;
    submitBtn.classList.remove('btn-loading');
    btnSpinner.style.display = 'none';
    btnText.textContent = 'Criar cadastro';
  }
});

fetchMe();

window.addEventListener('beforeunload', () => {
  if (window._qrRefreshTimer) clearInterval(window._qrRefreshTimer);
});
