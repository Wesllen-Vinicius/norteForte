// =================================================================
// Funções de Validação de Documentos
// =================================================================

/**
 * Valida um número de CNPJ.
 * @param cnpj O CNPJ a ser validado (pode conter máscara).
 * @returns `true` se o CNPJ for válido, `false` caso contrário.
 */
export const isValidCnpj = (cnpj: string | null | undefined): boolean => {
    if (!cnpj) return false;

    // Remove caracteres não numéricos
    const numbersOnly = cnpj.replace(/[^\d]+/g, '');

    if (numbersOnly.length !== 14) return false;

    // Elimina CNPJs inválidos conhecidos
    if (/^(\d)\1+$/.test(numbersOnly)) return false;

    let length = numbersOnly.length - 2;
    let numbers = numbersOnly.substring(0, length);
    const digits = numbersOnly.substring(length);
    let sum = 0;
    let pos = length - 7;

    for (let i = length; i >= 1; i--) {
        sum += parseInt(numbers.charAt(length - i), 10) * pos--;
        if (pos < 2) pos = 9;
    }

    let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (result !== parseInt(digits.charAt(0), 10)) return false;

    length = length + 1;
    numbers = numbersOnly.substring(0, length);
    sum = 0;
    pos = length - 7;

    for (let i = length; i >= 1; i--) {
        sum += parseInt(numbers.charAt(length - i), 10) * pos--;
        if (pos < 2) pos = 9;
    }

    result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (result !== parseInt(digits.charAt(1), 10)) return false;

    return true;
};


/**
 * Valida um número de CPF.
 * @param cpf O CPF a ser validado (pode conter máscara).
 * @returns `true` se o CPF for válido, `false` caso contrário.
 */
export const isValidCpf = (cpf: string | null | undefined): boolean => {
    if (!cpf) return false;

    const numbersOnly = cpf.replace(/[^\d]+/g, '');

    if (numbersOnly.length !== 11 || /^(\d)\1+$/.test(numbersOnly)) return false;

    let sum = 0;
    let remainder;

    for (let i = 1; i <= 9; i++) {
        sum = sum + parseInt(numbersOnly.substring(i - 1, i), 10) * (11 - i);
    }

    remainder = (sum * 10) % 11;
    if ((remainder === 10) || (remainder === 11)) remainder = 0;
    if (remainder !== parseInt(numbersOnly.substring(9, 10), 10)) return false;

    sum = 0;
    for (let i = 1; i <= 10; i++) {
        sum = sum + parseInt(numbersOnly.substring(i - 1, i), 10) * (12 - i);
    }

    remainder = (sum * 10) % 11;
    if ((remainder === 10) || (remainder === 11)) remainder = 0;
    if (remainder !== parseInt(numbersOnly.substring(10, 11), 10)) return false;

    return true;
};
