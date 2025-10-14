export const onlyDigits = (str: string): string => str.replace(/\D+/g, '')

export const isValidCPF = (cpf: string): boolean => {
  const digits = onlyDigits(cpf)
  
  if (!digits || digits.length !== 11 || /^([0-9])\1+$/.test(digits)) {
    return false
  }

  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += parseInt(digits[i]) * (10 - i)
  }
  
  let rev = 11 - (sum % 11)
  if (rev === 10 || rev === 11) rev = 0
  if (rev !== parseInt(digits[9])) return false

  sum = 0
  for (let i = 0; i < 10; i++) {
    sum += parseInt(digits[i]) * (11 - i)
  }
  
  rev = 11 - (sum % 11)
  if (rev === 10 || rev === 11) rev = 0
  
  return rev === parseInt(digits[10])
}

export const isValidPhone = (phone: string): boolean => {
  const digits = onlyDigits(phone)
  return /^\+?55?\d{10,11}$/.test(digits)
}

export const isValidCEP = (cep: string): boolean => {
  const digits = onlyDigits(cep)
  return /^\d{8}$/.test(digits)
}

export const formatCPF = (cpf: string): string => {
  const digits = onlyDigits(cpf)
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

export const formatPhone = (phone: string): string => {
  const digits = onlyDigits(phone)
  if (digits.length === 11) {
    return digits.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
  }
  return digits.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
}

export const formatCEP = (cep: string): string => {
  const digits = onlyDigits(cep)
  return digits.replace(/(\d{5})(\d{3})/, '$1-$2')
}