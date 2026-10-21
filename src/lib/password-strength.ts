/**
 * Password strength evaluator for FarmaciaDB user registrations.
 * Evaluates strength into 3 levels:
 * - 'baja' (Débil): Length < 6 or very simple pattern. CANNOT create account.
 * - 'media' (Aceptable): Length >= 6 with mixed letters + numbers. CAN create account.
 * - 'fuerte' (Robusta): Length >= 8 with uppercase, lowercase, numbers and/or symbols. CAN create account.
 */

export type PasswordStrengthLevel = "vacia" | "baja" | "media" | "fuerte";

export interface PasswordAnalysis {
  level: PasswordStrengthLevel;
  score: number; // 0: empty, 1: baja, 2: media, 3: fuerte
  label: string;
  colorClass: string;
  barWidthPct: number;
  isAllowed: boolean;
  feedback: string;
  checks: {
    minChars: boolean; // >= 6 chars
    hasNumber: boolean; // 0-9
    hasMixedCaseOrSymbol: boolean; // [A-Z] or symbols
    strongChars: boolean; // >= 8 chars
  };
}

export function evaluatePasswordStrength(password: string): PasswordAnalysis {
  if (!password) {
    return {
      level: "vacia",
      score: 0,
      label: "Ingresa una contraseña",
      colorClass: "bg-muted text-muted-foreground",
      barWidthPct: 0,
      isAllowed: false,
      feedback: "Escribe una contraseña para evaluar su seguridad.",
      checks: {
        minChars: false,
        hasNumber: false,
        hasMixedCaseOrSymbol: false,
        strongChars: false,
      },
    };
  }

  const length = password.length;
  const hasMinChars = length >= 6;
  const hasStrongChars = length >= 8;
  const hasNumber = /[0-9]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const hasMixedCaseOrSymbol = (hasUpper && hasLower) || hasSpecial;

  // Obvious weak patterns
  const isObviousPattern =
    /^(123456|password|qwerty|abcdef|111111|000000|admin|empleado)$/i.test(
      password.trim()
    );

  // Scoring
  let score = 0;
  if (hasMinChars) score += 1;
  if (hasNumber && (hasLower || hasUpper)) score += 1;
  if (hasStrongChars && (hasUpper || hasSpecial)) score += 1;

  if (isObviousPattern || length < 6) {
    return {
      level: "baja",
      score: 1,
      label: "Baja (Débil — No permitida)",
      colorClass: "bg-destructive text-destructive-foreground",
      barWidthPct: 33,
      isAllowed: false,
      feedback:
        "Contraseña débil. Se requiere al menos nivel Medio (mínimo 6 caracteres combinando letras y números).",
      checks: {
        minChars: hasMinChars,
        hasNumber,
        hasMixedCaseOrSymbol,
        strongChars: hasStrongChars,
      },
    };
  }

  if (score >= 3 && hasStrongChars && (hasSpecial || (hasUpper && hasNumber))) {
    return {
      level: "fuerte",
      score: 3,
      label: "Fuerte (Excelente)",
      colorClass: "bg-emerald-500 text-white",
      barWidthPct: 100,
      isAllowed: true,
      feedback: "Contraseña de alta seguridad.",
      checks: {
        minChars: hasMinChars,
        hasNumber,
        hasMixedCaseOrSymbol,
        strongChars: hasStrongChars,
      },
    };
  }

  // Level Media
  return {
    level: "media",
    score: 2,
    label: "Media (Aceptable)",
    colorClass: "bg-amber-500 text-white",
    barWidthPct: 66,
    isAllowed: true,
    feedback: "Contraseña aceptable para registrar tu cuenta.",
    checks: {
      minChars: hasMinChars,
      hasNumber,
      hasMixedCaseOrSymbol,
      strongChars: hasStrongChars,
    },
  };
}
