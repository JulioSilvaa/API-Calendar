const phoneMask = (value) => {
  return value
    .replace(/\D/g, '')
    .replace(/^(\d{2})(\d)/g, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .replace(/(-\d{4})\d+?$/, '$1');
};

const documentMask = (value) => {
  value = value.replace(/\D/g, '');
  
  if (value.length <= 11) {
    return value
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  } else {
    return value
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .substring(0, 18);
  }
};

const cepMask = (value) => {
  return value
    .replace(/\D/g, '')
    .replace(/^(\d{5})(\d)/, '$1-$2')
    .replace(/(-\d{3})\d+?$/, '$1');
};

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

const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

const validateFullName = (name) => {
  const words = name.trim().split(/\s+/);
  return words.length >= 2 && words.every(word => word.length >= 2);
};

const validatePhone = (phone) => {
  const digits = phone.replace(/\D/g, '');
  return digits.length === 11;
};

const validateCEP = (cep) => {
  const digits = cep.replace(/\D/g, '');
  return digits.length === 8;
};

const phoneInput = document.getElementById('phone');
const documentInput = document.getElementById('document');
const cepInput = document.getElementById('cep');

phoneInput.addEventListener('input', (e) => {
  e.target.value = phoneMask(e.target.value);
});

documentInput.addEventListener('input', (e) => {
  e.target.value = documentMask(e.target.value);
});

cepInput.addEventListener('input', async (e) => {
  e.target.value = cepMask(e.target.value);
  
  // Buscar automaticamente quando CEP estiver completo (8 dígitos)
  const cleanCEP = e.target.value.replace(/\D/g, '');
  if (cleanCEP.length === 8) {
    await fetchAddressByCEP(e.target.value);
  }
});

const setFieldState = (fieldId, isValid, errorMessage = '') => {
  const field = document.getElementById(fieldId);
  const formGroup = field.closest('.form-group');
  const errorDiv = formGroup.querySelector('.error-message');
  
  formGroup.classList.remove('error', 'success');
  
  if (field.value.trim() === '') {
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

document.getElementById('fullName').addEventListener('blur', (e) => {
  const value = e.target.value.trim();
  if (value) {
    const isValid = validateFullName(value);
    setFieldState('fullName', isValid, 'Digite nome e sobrenome completos');
  }
});

document.getElementById('email').addEventListener('blur', (e) => {
  const value = e.target.value.trim();
  if (value) {
    const isValid = validateEmail(value);
    setFieldState('email', isValid, 'E-mail inválido');
    
    const confirmEmail = document.getElementById('confirmEmail');
    if (confirmEmail.value) {
      confirmEmail.dispatchEvent(new Event('blur'));
    }
  }
});

document.getElementById('confirmEmail').addEventListener('blur', (e) => {
  const value = e.target.value.trim();
  const email = document.getElementById('email').value.trim();
  if (value) {
    const isValid = value === email && validateEmail(value);
    setFieldState('confirmEmail', isValid, 'Os e-mails não coincidem');
  }
});

phoneInput.addEventListener('blur', (e) => {
  const value = e.target.value;
  if (value) {
    const isValid = validatePhone(value);
    setFieldState('phone', isValid, 'Celular inválido (11 dígitos)');
  }
});

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


cepInput.addEventListener('blur', async (e) => {
  const value = e.target.value;
  if (value) {
    const isValid = validateCEP(value);
    if (isValid) {
      // Buscar endereço na API ViaCEP (caso ainda não tenha sido buscado)
      const cleanCEP = value.replace(/\D/g, '');
      if (cleanCEP.length === 8 && !document.getElementById('street').value) {
        await fetchAddressByCEP(value);
      }
    } else {
      setFieldState('cep', false, 'CEP inválido (8 dígitos)');
    }
  }
});


const fetchAddressByCEP = async (cep) => {
  const cleanCEP = cep.replace(/\D/g, '');
  
  const cepInput = document.getElementById('cep');
  const cepFormGroup = cepInput.closest('.form-group');
  const cepErrorDiv = cepFormGroup.querySelector('.error-message');
  const inputWrapper = cepInput.closest('.input-wrapper');
  
  // Adicionar estado de loading
  cepInput.disabled = true;
  cepFormGroup.classList.add('loading');
  cepErrorDiv.textContent = '🔍 Buscando endereço...';
  cepErrorDiv.style.color = '#2563eb';
  cepErrorDiv.style.fontWeight = '500';
  
  // Adicionar classe de loading ao input wrapper para animação
  inputWrapper.style.position = 'relative';
  inputWrapper.style.opacity = '0.7';
  
  try {
    const response = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);
    const data = await response.json();
    
    if (data.erro) {
      setFieldState('cep', false, 'CEP não encontrado');
      clearAddressFields();
      hideAddressFields();
      return;
    }
    
    document.getElementById('street').value = data.logradouro || '';
    document.getElementById('neighborhood').value = data.bairro || '';
    document.getElementById('city').value = data.localidade || '';
    document.getElementById('state').value = data.uf || '';
    
    setFieldState('cep', true);
    cepErrorDiv.textContent = '✓ Endereço encontrado';
    cepErrorDiv.style.color = '#16a34a';
    
    // Limpar mensagem de sucesso após 2 segundos
    setTimeout(() => {
      cepErrorDiv.textContent = '';
      cepErrorDiv.style.color = '';
      cepErrorDiv.style.fontWeight = '';
    }, 2000);
    
    showAddressFields();
    
    document.getElementById('number').focus();
    
  } catch (error) {
    console.error('Erro ao buscar CEP:', error);
    setFieldState('cep', false, 'Erro ao buscar CEP. Tente novamente.');
    clearAddressFields();
    hideAddressFields();
  } finally {
    // Remover estado de loading
    cepInput.disabled = false;
    cepFormGroup.classList.remove('loading');
    inputWrapper.style.opacity = '1';
  }
};

const showAddressFields = () => {
  document.getElementById('streetRow').classList.remove('hidden');
  document.getElementById('numberRow').classList.remove('hidden');
  document.getElementById('cityRow').classList.remove('hidden');
  document.getElementById('stateRow').classList.remove('hidden');
};

const hideAddressFields = () => {
  document.getElementById('streetRow').classList.add('hidden');
  document.getElementById('numberRow').classList.add('hidden');
  document.getElementById('cityRow').classList.add('hidden');
  document.getElementById('stateRow').classList.add('hidden');
};

const clearAddressFields = () => {
  document.getElementById('street').value = '';
  document.getElementById('neighborhood').value = '';
  document.getElementById('city').value = '';
  document.getElementById('state').value = '';
  document.getElementById('number').value = '';
  document.getElementById('complement').value = '';
};

document.getElementById('company').addEventListener('blur', (e) => {
  const value = e.target.value.trim();
  if (value) {
    const isValid = value.length >= 3;
    setFieldState('company', isValid, 'Nome da empresa muito curto');
  }
});


let isUserLoggedIn = false;

const checkFormValidity = () => {
  const fullName = document.getElementById('fullName').value.trim();
  const email = document.getElementById('email').value.trim();
  const confirmEmail = document.getElementById('confirmEmail').value.trim();
  const phone = document.getElementById('phone').value;
  const documentValue = document.getElementById('document').value;
  const company = document.getElementById('company').value.trim();
  const cep = document.getElementById('cep').value;
  const street = document.getElementById('street').value.trim();
  const neighborhood = document.getElementById('neighborhood').value.trim();
  const city = document.getElementById('city').value.trim();
  const state = document.getElementById('state').value.trim();
  const number = document.getElementById('number').value.trim();
  
  const allFieldsFilled = fullName && email && confirmEmail && phone && documentValue && 
                          company && cep && street && neighborhood && city && state && number;
  
  if (!allFieldsFilled) {
    return false;
  }
  
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
  const isNumberValid = number.length >= 1;
  
  const allValid = isFullNameValid && isEmailValid && isConfirmEmailValid && 
         isPhoneValid && isDocumentValid && isCepValid && isCompanyValid && isNumberValid;
  
  return allValid;
};

const updateSubmitButton = () => {
  const submitBtn = document.getElementById('submitBtn');
  const isFormValid = checkFormValidity();
  
  if (isFormValid && isUserLoggedIn) {
    submitBtn.disabled = false;
  } else {
    submitBtn.disabled = true;
  }
};

const formInputs = ['fullName', 'email', 'confirmEmail', 'phone', 'document', 'company', 'cep', 'street', 'neighborhood', 'city', 'state', 'number', 'complement'];

formInputs.forEach(fieldId => {
  const field = document.getElementById(fieldId);
  field.addEventListener('input', updateSubmitButton);
  field.addEventListener('blur', updateSubmitButton);
});

document.getElementById('submitBtn').disabled = true;

async function fetchMe() {
  const res = await fetch('/me');
  const data = await res.json();
  const logged = !!data.email;
  
  isUserLoggedIn = logged;
  
  document.getElementById('not-logged').classList.toggle('hidden', logged);
  document.getElementById('loginBtn').style.display = logged ? 'none' : 'inline-block';
  document.getElementById('logged').classList.toggle('hidden', !logged);
  if (logged) document.getElementById('userEmail').textContent = data.email;
  
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
  
  const fullName = document.getElementById('fullName').value.trim();
  const email = document.getElementById('email').value.trim();
  const confirmEmail = document.getElementById('confirmEmail').value.trim();
  const phone = document.getElementById('phone').value;
  const documentValue = document.getElementById('document').value;
  const companyName = document.getElementById('company').value.trim();
  const cep = document.getElementById('cep').value;
  const street = document.getElementById('street').value.trim();
  const neighborhood = document.getElementById('neighborhood').value.trim();
  const city = document.getElementById('city').value.trim();
  const state = document.getElementById('state').value.trim();
  const number = document.getElementById('number').value.trim();
  const complement = document.getElementById('complement').value.trim();
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

  const payload = {
    fullName,
    email,
    phone,
    document: documentValue,
    companyName,
    address: {
      cep,
      street,
      number,
      complement: complement || '',
      neighborhood,
      city,
      state
    },
    calendar: {
      summary,
      description: `Calendário de ${companyName}`,
      timeZone
    }
  };

  try {
    const res = await fetch('/calendars', { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify(payload) 
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
      
      formStatus.textContent = `${icon} ${errorMessage}`;
      formStatus.className = 'status err';
      
      if (errorDetails && errorDetails !== errorMessage) {
        formStatus.innerHTML = `${icon} ${errorMessage}<br><small style="font-size: 0.9em; opacity: 0.9;">${errorDetails}</small>`;
      }
      
      showToast(`${icon} ${errorMessage}`, 'err');
      
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
        formStatus.textContent = 'Cadastro criado com sucesso! Você receberá instruções por email.';
      }
    }
  } catch (err) {
    
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
