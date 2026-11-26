import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { apiFetch, comprobarConexion } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { descargarCatalogo, descontarLocal, leerCatalogo } from './catalogo';
import { pendientesBorrar, pendientesGuardar, pendientesTodas } from './db';
import { cuerpoDeVenta, sincronizarPendientes } from './sincronizador';

const SyncContext = createContext(null);
const CADA_MS = 30_000;
const CONEXION_MS = 15_000;

export function SyncProvider({ children }) {
  const { sesion } = useAuth();
  const token = sesion?.token ?? null;
  const usuarioId = sesion?.usuario?.id ?? null;

  const [enLinea, setEnLinea] = useState(navigator.onLine);
  const [catalogo, setCatalogo] = useState(null);
  const [pendientes, setPendientes] = useState([]);
  const [sincronizando, setSincronizando] = useState(false);
  const [aviso, setAviso] = useState('');
  const [resultadoSync, setResultadoSync] = useState(null);
  const ocupado = useRef(false);

  const verificarConexion = useCallback(async () => {
    const conectado = await comprobarConexion();
    setEnLinea(conectado);
    return conectado;
  }, []);

  const cargarPendientes = useCallback(async () => {
    const todas = await pendientesTodas();
    setPendientes(todas.sort((a, b) => new Date(a.fechaVentaUtc) - new Date(b.fechaVentaUtc)));
    return todas;
  }, []);

  const refrescarCatalogo = useCallback(async () => {
    if (!token) return;
    try {
      setCatalogo(await descargarCatalogo(token));
      setEnLinea(true);
    } catch (e) {
      if (e.code === 'SIN_CONEXION') setEnLinea(false);
    }
  }, [token]);

  const sincronizar = useCallback(async () => {
    if (!token || ocupado.current) return null;
    ocupado.current = true;
    setSincronizando(true);
    try {
      const r = await sincronizarPendientes({
        listar: pendientesTodas,
        guardar: pendientesGuardar,
        borrar: pendientesBorrar,
        enviar: (v) => apiFetch('/api/ventas', { metodo: 'POST', cuerpo: cuerpoDeVenta(v), token }),
        usuarioId,
      });
      if (r.detenida === 'red') setEnLinea(false);
      else if (r.sincronizadas || r.conflictos || r.errores) setEnLinea(true);

      if (r.sincronizadas) setAviso(`${r.sincronizadas} venta${r.sincronizadas === 1 ? '' : 's'} sincronizada${r.sincronizadas === 1 ? '' : 's'}.`);
      if (r.conflictos) setAviso(`${r.conflictos} venta${r.conflictos === 1 ? '' : 's'} con conflicto de existencias. Revisa Pendientes.`);
      if (r.sincronizadas || r.conflictos || r.errores) setResultadoSync(r);

      await cargarPendientes();
      if (r.sincronizadas) await refrescarCatalogo();
      return r;
    } finally {
      ocupado.current = false;
      setSincronizando(false);
    }
  }, [token, usuarioId, cargarPendientes, refrescarCatalogo]);

  /** Guarda la venta en el dispositivo y baja el stock local. */
  const registrarPendiente = useCallback(
    async (venta) => {
      await pendientesGuardar(venta);
      setCatalogo(await descontarLocal(venta.detalles));
      await cargarPendientes();
    },
    [cargarPendientes],
  );

  const descartar = useCallback(
    async (idLocal) => {
      await pendientesBorrar(idLocal);
      await cargarPendientes();
    },
    [cargarPendientes],
  );

  const reintentar = useCallback(
    async (venta) => {
      await pendientesGuardar({ ...venta, estado: 'pendiente', error: undefined, faltantes: undefined });
      await cargarPendientes();
      await sincronizar();
    },
    [cargarPendientes, sincronizar],
  );

  // Carga inicial desde el dispositivo
  useEffect(() => {
    leerCatalogo().then(setCatalogo).catch(() => {});
    cargarPendientes().catch(() => {});
  }, [cargarPendientes]);

  // Estado de la conexión: los eventos avisan, pero solo el API confirma que hay internet de verdad.
  useEffect(() => {
    verificarConexion();
    const arriba = () => verificarConexion();
    const abajo = () => setEnLinea(false);
    window.addEventListener('online', arriba);
    window.addEventListener('offline', abajo);
    const t = setInterval(verificarConexion, CONEXION_MS);
    return () => {
      window.removeEventListener('online', arriba);
      window.removeEventListener('offline', abajo);
      clearInterval(t);
    };
  }, [verificarConexion]);

  // Al entrar con token y cada vez que vuelve la conexión: primero se envían las ventas, luego se actualiza el catálogo.
  useEffect(() => {
    if (!token || !enLinea) return;
    (async () => {
      const r = await sincronizar();
      if (!r?.sincronizadas) await refrescarCatalogo();
    })();
  }, [token, enLinea, sincronizar, refrescarCatalogo]);

  // Reintento periódico mientras haya pendientes
  useEffect(() => {
    if (!token) return;
    const t = setInterval(() => {
      if (pendientes.some((v) => v.estado === 'pendiente')) sincronizar();
    }, CADA_MS);
    return () => clearInterval(t);
  }, [token, pendientes, sincronizar]);

  const valor = useMemo(
    () => ({
      enLinea, catalogo, pendientes, sincronizando, aviso, resultadoSync, verificarConexion,
      limpiarAviso: () => setAviso(''), limpiarResultadoSync: () => setResultadoSync(null),
      sincronizar, refrescarCatalogo, registrarPendiente, descartar, reintentar,
    }),
    [enLinea, catalogo, pendientes, sincronizando, aviso, resultadoSync, verificarConexion, sincronizar, refrescarCatalogo, registrarPendiente, descartar, reintentar],
  );
  return <SyncContext.Provider value={valor}>{children}</SyncContext.Provider>;
}

export const useSync = () => useContext(SyncContext);
