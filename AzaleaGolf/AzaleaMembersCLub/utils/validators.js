import { validations } from "../config.js";
import { handleValidationError } from "./errorHandler.js";

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

export function validateGolfShotData(shotData) {
  const errors = [];

  if (!shotData || typeof shotData !== "object") {
    errors.push("Datos de tiro inválidos");
    return { isValid: false, errors };
  }

  const requiredFields = [
    "club name",
    "ball speed (mph)",
    "launch angle (deg)",
    "carry (yds)",
    "total distance (yds)",
  ];

  requiredFields.forEach((field) => {
    if (
      !shotData.hasOwnProperty(field) ||
      shotData[field] === null ||
      shotData[field] === undefined
    ) {
      errors.push(`Campo requerido faltante: ${field}`);
    }
  });

  const validations = {
    "ball speed (mph)": { min: 50, max: 200 },
    "launch angle (deg)": { min: 0, max: 90 },
    "carry (yds)": { min: 0, max: 400 },
    "total distance (yds)": { min: 0, max: 500 },
    "club speed (mph)": { min: 30, max: 150 },
    efficiency: { min: 0, max: 2 },
  };

  Object.entries(validations).forEach(([field, range]) => {
    if (shotData[field] !== undefined && shotData[field] !== null) {
      const value = parseFloat(shotData[field]);
      if (isNaN(value)) {
        errors.push(`${field} debe ser un número válido`);
      } else if (value < range.min || value > range.max) {
        errors.push(`${field} debe estar entre ${range.min} y ${range.max}`);
      }
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function validateGolfSession(sessionData) {
  const errors = [];

  if (!sessionData || typeof sessionData !== "object") {
    errors.push("Datos de sesión inválidos");
    return { isValid: false, errors };
  }

  if (!sessionData.fecha) {
    errors.push("Fecha de sesión requerida");
  }

  if (!sessionData.datos || !Array.isArray(sessionData.datos)) {
    errors.push("Datos de tiros requeridos");
  } else if (sessionData.datos.length === 0) {
    errors.push("La sesión debe contener al menos un tiro");
  } else {
    sessionData.datos.forEach((shot, index) => {
      const shotValidation = validateGolfShotData(shot);
      if (!shotValidation.isValid) {
        shotValidation.errors.forEach((error) => {
          errors.push(`Tiro ${index + 1}: ${error}`);
        });
      }
    });
  }

  if (sessionData.stats) {
    if (
      typeof sessionData.stats.shotCount !== "number" ||
      sessionData.stats.shotCount < 0
    ) {
      errors.push("Número de tiros inválido");
    }

    if (
      sessionData.stats.sessionTime &&
      typeof sessionData.stats.sessionTime !== "string"
    ) {
      errors.push("Tiempo de sesión inválido");
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function validateForm(formData, validationRules) {
  const errors = [];
  const fieldErrors = {};

  Object.entries(validationRules).forEach(([fieldName, rules]) => {
    const fieldValue = formData[fieldName];
    const fieldValidation = validateField(fieldValue, rules);

    if (!fieldValidation.isValid) {
      errors.push(fieldValidation.message);
      fieldErrors[fieldName] = fieldValidation.message;
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    fieldErrors,
  };
}

function validateField(value, rules) {
  if (rules.required && (!value || value.toString().trim() === "")) {
    return {
      isValid: false,
      message: rules.requiredMessage || "Este campo es requerido",
    };
  }

  if (!value || value.toString().trim() === "") {
    return { isValid: true, message: "" };
  }

  if (rules.type) {
    const typeValidation = validateType(value, rules.type);
    if (!typeValidation.isValid) {
      return typeValidation;
    }
  }

  if (rules.minLength && value.toString().length < rules.minLength) {
    return {
      isValid: false,
      message: `Mínimo ${rules.minLength} caracteres`,
    };
  }

  if (rules.maxLength && value.toString().length > rules.maxLength) {
    return {
      isValid: false,
      message: `Máximo ${rules.maxLength} caracteres`,
    };
  }

  if (rules.pattern && !rules.pattern.test(value)) {
    return {
      isValid: false,
      message: rules.patternMessage || "Formato inválido",
    };
  }

  if (rules.min !== undefined && parseFloat(value) < rules.min) {
    return {
      isValid: false,
      message: `Valor mínimo: ${rules.min}`,
    };
  }

  if (rules.max !== undefined && parseFloat(value) > rules.max) {
    return {
      isValid: false,
      message: `Valor máximo: ${rules.max}`,
    };
  }

  if (rules.custom) {
    const customValidation = rules.custom(value);
    if (!customValidation.isValid) {
      return customValidation;
    }
  }

  return { isValid: true, message: "" };
}

function validateType(value, type) {
  switch (type) {
    case "email":
      return validateEmail(value);

    case "number":
      if (isNaN(parseFloat(value))) {
        return {
          isValid: false,
          message: "Debe ser un número válido",
        };
      }
      break;

    case "integer":
      if (!Number.isInteger(parseFloat(value))) {
        return {
          isValid: false,
          message: "Debe ser un número entero",
        };
      }
      break;

    case "date":
      if (isNaN(Date.parse(value))) {
        return {
          isValid: false,
          message: "Debe ser una fecha válida",
        };
      }
      break;

    case "url":
      try {
        new URL(value);
      } catch {
        return {
          isValid: false,
          message: "Debe ser una URL válida",
        };
      }
      break;
  }

  return { isValid: true, message: "" };
}

export function clearFormErrors(form) {
  const errorElements = form.querySelectorAll(".error-message, .field-error");
  errorElements.forEach((element) => element.remove());

  const errorFields = form.querySelectorAll(".error-field");
  errorFields.forEach((field) => field.classList.remove("error-field"));
}

export function showFormErrors(form, fieldErrors) {
  Object.entries(fieldErrors).forEach(([fieldName, errorMessage]) => {
    const field = form.querySelector(`[name="${fieldName}"]`);
    if (field) {
      field.classList.add("error-field");

      const errorElement = document.createElement("div");
      errorElement.className = "error-message";
      errorElement.textContent = errorMessage;

      field.parentNode.insertBefore(errorElement, field.nextSibling);
    }
  });
}

export function setupRealTimeValidation(form, validationRules) {
  Object.entries(validationRules).forEach(([fieldName, rules]) => {
    const field = form.querySelector(`[name="${fieldName}"]`);
    if (field) {
      field.addEventListener("blur", () => {
        const value = field.value;
        const validation = validateField(value, rules);

        const existingError = field.parentNode.querySelector(".error-message");
        if (existingError) {
          existingError.remove();
        }
        field.classList.remove("error-field");

        if (!validation.isValid) {
          field.classList.add("error-field");
          const errorElement = document.createElement("div");
          errorElement.className = "error-message";
          errorElement.textContent = validation.message;
          field.parentNode.insertBefore(errorElement, field.nextSibling);
        }
      });

      let timeout;
      field.addEventListener("input", () => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          const value = field.value;
          const validation = validateField(value, rules);

          if (value.trim() !== "" && !validation.isValid) {
            const existingError =
              field.parentNode.querySelector(".error-message");
            if (existingError) {
              existingError.remove();
            }
            field.classList.remove("error-field");

            field.classList.add("error-field");
            const errorElement = document.createElement("div");
            errorElement.className = "error-message";
            errorElement.textContent = validation.message;
            field.parentNode.insertBefore(errorElement, field.nextSibling);
          } else if (validation.isValid) {
            const existingError =
              field.parentNode.querySelector(".error-message");
            if (existingError) {
              existingError.remove();
            }
            field.classList.remove("error-field");
          }
        }, 300);
      });
    }
  });
}
