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

export const isValidCNPJ = (cnpj: string): boolean => {
  const digits = onlyDigits(cnpj)

  if (!digits || digits.length !== 14 || /^([0-9])\1+$/.test(digits)) {
    return false
  }

  const calcDigit = (base: string, weights: number[]) => {
    const sum = weights.reduce((acc, weight, index) => acc + parseInt(base[index], 10) * weight, 0)
    const remainder = sum % 11
    return remainder < 2 ? 0 : 11 - remainder
  }

  const firstDigit = calcDigit(digits.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
  const secondDigit = calcDigit(digits.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])

  return firstDigit === parseInt(digits[12], 10) && secondDigit === parseInt(digits[13], 10)
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

export const formatCNPJ = (cnpj: string): string => {
  const digits = onlyDigits(cnpj).slice(0, 14)
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
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
