// src/utils/validators.js
export const required = (v) => {
  const ok = v !== null && v !== undefined && String(v).trim().length > 0;
  return ok ? null : 'required';
};

export function passwordIssues(pw = '') {
  const issues = [];
  const s = String(pw);

  if (s.length < 8) issues.push('minLength');
  if (!(/[a-z]/.test(s) && /[A-Z]/.test(s))) issues.push('mixedCase');
  if (!(/\d/.test(s) || /[^\w\s]/.test(s))) issues.push('digitOrSymbol');

  return issues;
}
export const isPasswordStrong = (pw) => passwordIssues(pw).length === 0;

export function sanitizeText(input = '', { max = 2000 } = {}) {
  if (input == null) return '';
  let s = String(input);

  s = s.replace(/<[^>]*>/g, '');
  s = s.replace(/[\u0000-\u001F\u007F]+/g, '').replace(/[\u200B-\u200F\u202A-\u202E]/g, '');
  s = s.replace(/\s+/g, ' ').trim();

  if (s.length > max) s = s.slice(0, max);

  return s;
}
