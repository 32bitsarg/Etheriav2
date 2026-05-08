export interface ValidationRule {
  test: (value: string) => boolean;
  message: string;
}

export interface FieldErrors {
  [key: string]: string | undefined;
}

export const emailRules: ValidationRule[] = [
  {
    test: (v) => v.length > 0,
    message: "validation.email.required",
  },
  {
    test: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
    message: "validation.email.invalid",
  },
];

export const passwordRules: ValidationRule[] = [
  {
    test: (v) => v.length >= 6,
    message: "validation.password.minLength",
  },
  {
    test: (v) => v.length <= 72,
    message: "validation.password.maxLength",
  },
];

export const passwordRulesStrong: ValidationRule[] = [
  ...passwordRules,
  {
    test: (v) => /[A-Z]/.test(v),
    message: "validation.password.uppercase",
  },
  {
    test: (v) => /[a-z]/.test(v),
    message: "validation.password.lowercase",
  },
  {
    test: (v) => /[0-9]/.test(v),
    message: "validation.password.number",
  },
];

export const usernameRules: ValidationRule[] = [
  {
    test: (v) => v.length >= 3,
    message: "validation.username.minLength",
  },
  {
    test: (v) => v.length <= 20,
    message: "validation.username.maxLength",
  },
  {
    test: (v) => /^[a-zA-Z0-9_]+$/.test(v),
    message: "validation.username.invalid",
  },
];

export const nameRules: ValidationRule[] = [
  {
    test: (v) => v.length >= 2,
    message: "validation.name.minLength",
  },
  {
    test: (v) => v.length <= 50,
    message: "validation.name.maxLength",
  },
];

export const cityNameRules: ValidationRule[] = [
  {
    test: (v) => v.length >= 2,
    message: "validation.cityName.minLength",
  },
  {
    test: (v) => v.length <= 30,
    message: "validation.cityName.maxLength",
  },
];

export function validateField(value: string, rules: ValidationRule[]): string | undefined {
  for (const rule of rules) {
    if (!rule.test(value)) {
      return rule.message;
    }
  }
  return undefined;
}

export function validateForm(fields: Record<string, { value: string; rules: ValidationRule[] }>): FieldErrors {
  const errors: FieldErrors = {};
  for (const [field, { value, rules }] of Object.entries(fields)) {
    const error = validateField(value, rules);
    if (error) {
      errors[field] = error;
    }
  }
  return errors;
}

export function hasErrors(errors: FieldErrors): boolean {
  return Object.values(errors).some((e) => e !== undefined);
}

export function isEmailOrUsername(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function getEmailMatchStatus(value: string, originalEmail: string): "empty" | "match" | "mismatch" {
  if (!value) return "empty";
  return value === originalEmail ? "match" : "mismatch";
}

export function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 2) return { score, label: "validation.strength.weak", color: "bg-red-500" };
  if (score <= 4) return { score, label: "validation.strength.medium", color: "bg-amber-500" };
  return { score, label: "validation.strength.strong", color: "bg-green-500" };
}
