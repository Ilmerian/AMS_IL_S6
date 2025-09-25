export const required = (v) => {
  const ok = v !== null && v !== undefined && String(v).trim().length > 0
  return ok ? null : 'required'
}
