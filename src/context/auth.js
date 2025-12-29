// src/context/auth.js
/**
 * Contexte d'authentification de l'application
 */
import { createContext, useContext } from 'react'
export const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)
