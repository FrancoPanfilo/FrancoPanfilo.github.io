import { validations } from "../config.js";

export function validateEmail(email) {
  if (!email || email.trim() === "") {
    return {
      isValid: false,
      message: "El correo electrónico es requerido",
    };
  }

  if (!validations.email.pattern.test(email)) {
    return {
      isValid: false,
      message: validations.email.message,
    };
  }

  return {
    isValid: true,
    message: "",
  };
}

export function validatePassword(password) {
  if (!password || password.trim() === "") {
    return {
      isValid: false,
      message: "La contraseña es requerida",
      strength: 0,
    };
  }

  if (password.length < validations.password.minLength) {
    return {
      isValid: false,
      message: validations.password.message,
      strength: 0,
    };
  }

  let strength = 0;
  const checks = {
    length: password.length >= 8,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    numbers: /\d/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };

  Object.values(checks).forEach((check) => {
    if (check) strength += 20;
  });

  let message = "";
  if (strength < 40) {
    message =
      "Contraseña débil. Usa mayúsculas, minúsculas, números y símbolos.";
  } else if (strength < 80) {
    message = "Contraseña moderada.";
  } else {
    message = "Contraseña fuerte.";
  }

  return {
    isValid: true,
    message,
    strength,
  };
}

export function validateName(name, fieldName = "nombre") {
  if (!name || name.trim() === "") {
    return {
      isValid: false,
      message: `El ${fieldName} es requerido`,
    };
  }

  const trimmedName = name.trim();

  if (trimmedName.length < validations.name.minLength) {
    return {
      isValid: false,
      message: `El ${fieldName} debe tener al menos ${validations.name.minLength} caracteres`,
    };
  }

  if (trimmedName.length > validations.name.maxLength) {
    return {
      isValid: false,
      message: `El ${fieldName} no puede tener más de ${validations.name.maxLength} caracteres`,
    };
  }

  if (!validations.name.pattern.test(trimmedName)) {
    return {
      isValid: false,
      message: validations.name.message,
    };
  }

  return {
    isValid: true,
    message: "",
  };
}

export function validatePasswordConfirmation(password, confirmPassword) {
  if (!confirmPassword || confirmPassword.trim() === "") {
    return {
      isValid: false,
      message: "Confirma tu contraseña",
    };
  }

  if (password !== confirmPassword) {
    return {
      isValid: false,
      message: "Las contraseñas no coinciden",
    };
  }

  return {
    isValid: true,
    message: "",
  };
}
