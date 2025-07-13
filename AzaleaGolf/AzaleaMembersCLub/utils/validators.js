/**
 * UTILIDADES DE VALIDACIÓN
 *
 * Este módulo proporciona funciones de validación reutilizables
 * para formularios y datos en toda la aplicación.
 *
 * Incluye validaciones para:
 * - Emails
 * - Contraseñas
 * - Nombres
 * - Datos de golf
 * - Formularios completos
 */

import { validations } from "../config.js";
import { handleValidationError } from "./errorHandler.js";

/**
 * VALIDACIÓN DE EMAIL
 * Verifica que el email tenga un formato válido
 *
 * @param {string} email - Email a validar
 * @returns {Object} Resultado de la validación {isValid, message}
 */
export function validateEmail(email) {
  // Verificar que el email no esté vacío
  if (!email || email.trim() === "") {
    return {
      isValid: false,
      message: "El correo electrónico es requerido",
    };
  }

  // Verificar formato usando regex
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

/**
 * VALIDACIÓN DE CONTRASEÑA
 * Verifica que la contraseña cumpla con los requisitos de seguridad
 *
 * @param {string} password - Contraseña a validar
 * @returns {Object} Resultado de la validación {isValid, message, strength}
 */
export function validatePassword(password) {
  // Verificar que la contraseña no esté vacía
  if (!password || password.trim() === "") {
    return {
      isValid: false,
      message: "La contraseña es requerida",
      strength: 0,
    };
  }

  // Verificar longitud mínima
  if (password.length < validations.password.minLength) {
    return {
      isValid: false,
      message: validations.password.message,
      strength: 0,
    };
  }

  // Calcular fortaleza de la contraseña
  let strength = 0;
  const checks = {
    length: password.length >= 8,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    numbers: /\d/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };

  // Sumar puntos por cada criterio cumplido
  Object.values(checks).forEach((check) => {
    if (check) strength += 20;
  });

  // Determinar mensaje según fortaleza
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

/**
 * VALIDACIÓN DE NOMBRE
 * Verifica que el nombre tenga un formato válido
 *
 * @param {string} name - Nombre a validar
 * @param {string} fieldName - Nombre del campo (para mensajes de error)
 * @returns {Object} Resultado de la validación {isValid, message}
 */
export function validateName(name, fieldName = "nombre") {
  // Verificar que el nombre no esté vacío
  if (!name || name.trim() === "") {
    return {
      isValid: false,
      message: `El ${fieldName} es requerido`,
    };
  }

  const trimmedName = name.trim();

  // Verificar longitud mínima
  if (trimmedName.length < validations.name.minLength) {
    return {
      isValid: false,
      message: `El ${fieldName} debe tener al menos ${validations.name.minLength} caracteres`,
    };
  }

  // Verificar longitud máxima
  if (trimmedName.length > validations.name.maxLength) {
    return {
      isValid: false,
      message: `El ${fieldName} no puede tener más de ${validations.name.maxLength} caracteres`,
    };
  }

  // Verificar formato (solo letras y espacios)
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

/**
 * VALIDACIÓN DE CONFIRMACIÓN DE CONTRASEÑA
 * Verifica que la confirmación coincida con la contraseña original
 *
 * @param {string} password - Contraseña original
 * @param {string} confirmPassword - Confirmación de contraseña
 * @returns {Object} Resultado de la validación {isValid, message}
 */
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

/**
 * VALIDACIÓN DE DATOS DE GOLF
 * Valida los datos específicos del simulador de golf
 *
 * @param {Object} shotData - Datos del tiro a validar
 * @returns {Object} Resultado de la validación {isValid, errors}
 */
export function validateGolfShotData(shotData) {
  const errors = [];

  // Validar que existan datos
  if (!shotData || typeof shotData !== "object") {
    errors.push("Datos de tiro inválidos");
    return { isValid: false, errors };
  }

  // Validar campos requeridos
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

  // Validar rangos de valores
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

/**
 * VALIDACIÓN DE SESIÓN DE GOLF
 * Valida una sesión completa de golf
 *
 * @param {Object} sessionData - Datos de la sesión
 * @returns {Object} Resultado de la validación {isValid, errors}
 */
export function validateGolfSession(sessionData) {
  const errors = [];

  // Validar estructura básica
  if (!sessionData || typeof sessionData !== "object") {
    errors.push("Datos de sesión inválidos");
    return { isValid: false, errors };
  }

  // Validar campos requeridos de la sesión
  if (!sessionData.fecha) {
    errors.push("Fecha de sesión requerida");
  }

  if (!sessionData.datos || !Array.isArray(sessionData.datos)) {
    errors.push("Datos de tiros requeridos");
  } else if (sessionData.datos.length === 0) {
    errors.push("La sesión debe contener al menos un tiro");
  } else {
    // Validar cada tiro en la sesión
    sessionData.datos.forEach((shot, index) => {
      const shotValidation = validateGolfShotData(shot);
      if (!shotValidation.isValid) {
        shotValidation.errors.forEach((error) => {
          errors.push(`Tiro ${index + 1}: ${error}`);
        });
      }
    });
  }

  // Validar estadísticas si existen
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

/**
 * VALIDACIÓN DE FORMULARIO COMPLETO
 * Valida todos los campos de un formulario
 *
 * @param {Object} formData - Datos del formulario
 * @param {Object} validationRules - Reglas de validación por campo
 * @returns {Object} Resultado de la validación {isValid, errors, fieldErrors}
 */
export function validateForm(formData, validationRules) {
  const errors = [];
  const fieldErrors = {};

  // Validar cada campo según las reglas
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

/**
 * VALIDACIÓN DE CAMPO INDIVIDUAL
 * Valida un campo específico según las reglas proporcionadas
 *
 * @param {any} value - Valor del campo
 * @param {Object} rules - Reglas de validación
 * @returns {Object} Resultado de la validación {isValid, message}
 */
function validateField(value, rules) {
  // Validación de campo requerido
  if (rules.required && (!value || value.toString().trim() === "")) {
    return {
      isValid: false,
      message: rules.requiredMessage || "Este campo es requerido",
    };
  }

  // Si el campo no es requerido y está vacío, es válido
  if (!value || value.toString().trim() === "") {
    return { isValid: true, message: "" };
  }

  // Validación de tipo
  if (rules.type) {
    const typeValidation = validateType(value, rules.type);
    if (!typeValidation.isValid) {
      return typeValidation;
    }
  }

  // Validación de longitud
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

  // Validación de patrón (regex)
  if (rules.pattern && !rules.pattern.test(value)) {
    return {
      isValid: false,
      message: rules.patternMessage || "Formato inválido",
    };
  }

  // Validación de rango numérico
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

  // Validación personalizada
  if (rules.custom) {
    const customValidation = rules.custom(value);
    if (!customValidation.isValid) {
      return customValidation;
    }
  }

  return { isValid: true, message: "" };
}

/**
 * VALIDACIÓN DE TIPO DE DATO
 * Verifica que el valor sea del tipo especificado
 *
 * @param {any} value - Valor a validar
 * @param {string} type - Tipo esperado
 * @returns {Object} Resultado de la validación {isValid, message}
 */
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

/**
 * LIMPIAR MENSAJES DE ERROR
 * Remueve todos los mensajes de error de un formulario
 *
 * @param {HTMLElement} form - Elemento del formulario
 */
export function clearFormErrors(form) {
  // Remover mensajes de error existentes
  const errorElements = form.querySelectorAll(".error-message, .field-error");
  errorElements.forEach((element) => element.remove());

  // Remover clases de error
  const errorFields = form.querySelectorAll(".error-field");
  errorFields.forEach((field) => field.classList.remove("error-field"));
}

/**
 * MOSTRAR ERRORES DE FORMULARIO
 * Muestra los errores de validación en el formulario
 *
 * @param {HTMLElement} form - Elemento del formulario
 * @param {Object} fieldErrors - Errores por campo
 */
export function showFormErrors(form, fieldErrors) {
  Object.entries(fieldErrors).forEach(([fieldName, errorMessage]) => {
    const field = form.querySelector(`[name="${fieldName}"]`);
    if (field) {
      // Agregar clase de error al campo
      field.classList.add("error-field");

      // Crear elemento de mensaje de error
      const errorElement = document.createElement("div");
      errorElement.className = "error-message";
      errorElement.textContent = errorMessage;

      // Insertar después del campo
      field.parentNode.insertBefore(errorElement, field.nextSibling);
    }
  });
}

/**
 * VALIDACIÓN EN TIEMPO REAL
 * Configura validación automática mientras el usuario escribe
 *
 * @param {HTMLElement} form - Elemento del formulario
 * @param {Object} validationRules - Reglas de validación
 */
export function setupRealTimeValidation(form, validationRules) {
  Object.entries(validationRules).forEach(([fieldName, rules]) => {
    const field = form.querySelector(`[name="${fieldName}"]`);
    if (field) {
      // Validar al perder el foco
      field.addEventListener("blur", () => {
        const value = field.value;
        const validation = validateField(value, rules);

        // Limpiar error anterior
        const existingError = field.parentNode.querySelector(".error-message");
        if (existingError) {
          existingError.remove();
        }
        field.classList.remove("error-field");

        // Mostrar nuevo error si existe
        if (!validation.isValid) {
          field.classList.add("error-field");
          const errorElement = document.createElement("div");
          errorElement.className = "error-message";
          errorElement.textContent = validation.message;
          field.parentNode.insertBefore(errorElement, field.nextSibling);
        }
      });

      // Validar al escribir (con debounce)
      let timeout;
      field.addEventListener("input", () => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          const value = field.value;
          const validation = validateField(value, rules);

          // Solo mostrar errores si el campo no está vacío
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
        }, 300); // Debounce de 300ms
      });
    }
  });
}
