import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiFetch, registrarAlExpirarSesion } from '../api/client';
import { guardarCredencial, iniciarSesionSinConexion } from './offline';

const CLAVE_SESION = 'puntopyme.sesion';
const AuthContext = createContext(null);

function leerSesion() {
  try {
    const s = JSON.parse(localStorage.getItem(CLAVE_SESION));
    if (!s) return null;
    // Un token vencido no sirve; una sesión local (sin token) se conserva.
    if (s.token && s.expiraEnUtc && new Date(s.expiraEnUtc) <= new Date()) return null;
    return s;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [sesion, setSesion] = useState(leerSesion);

  const guardar = (s) => {
    localStorage.setItem(CLAVE_SESION, JSON.stringify(s));
    setSesion(s);
  };

  const cerrarSesion = useCallback(() => {
    localStorage.removeItem(CLAVE_SESION);
    setSesion(null);
  }, []);

  useEffect(() => registrarAlExpirarSesion(cerrarSesion), [cerrarSesion]);

  const iniciarSesion = useCallback(async (nombreUsuario, pin, rol) => {
    try {
      const respuesta = await apiFetch('/api/auth/login', {
        metodo: 'POST',
        cuerpo: { nombreUsuario, pin, rol },
      });
      await guardarCredencial({ nombreUsuario, pin, respuesta });
      guardar({ ...respuesta, modoLocal: false });
    } catch (e) {
      if (e.code !== 'SIN_CONEXION') throw e;
      const local = await iniciarSesionSinConexion(nombreUsuario, pin, rol);
      guardar({ ...local, modoLocal: true });
    }
  }, []);

  const valor = useMemo(() => ({ sesion, iniciarSesion, cerrarSesion }), [sesion, iniciarSesion, cerrarSesion]);
  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
