import { API_URL } from '../config';

export class ApiError extends Error {
  constructor({ status, code, detail, retryAfter, errors, datos }) {
    super(detail || 'Ocurrió un error.');
    this.status = status;
    this.code = code;
    this.retryAfter = retryAfter;
    this.errors = errors; // errores por campo (400 VALIDACION)
    this.datos = datos ?? {}; // cuerpo completo del ProblemDetails (p. ej. faltantes)
  }
}

/** navigator.onLine solo dice si hay adaptador de red: en Chrome puede seguir en true sin internet. */
export async function comprobarConexion() {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return false;

  let temporizador;
  const espera = new Promise((_, rechazar) => {
    temporizador = setTimeout(() => rechazar(new Error('Sin respuesta del servidor')), 3000);
  });
  try {
    const respuesta = await Promise.race([fetch(`${API_URL}/health`, { cache: 'no-store' }), espera]);
    return respuesta.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(temporizador);
  }
}

let alExpirarSesion = () => {};
export function registrarAlExpirarSesion(fn) {
  alExpirarSesion = fn;
}

export async function apiFetch(ruta, { metodo = 'GET', cuerpo, token } = {}) {
  let resp;
  try {
    resp = await fetch(`${API_URL}${ruta}`, {
      method: metodo,
      headers: {
        ...(cuerpo ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    });
  } catch {
    throw new ApiError({ status: 0, code: 'SIN_CONEXION', detail: 'No hay conexión con el servidor.' });
  }

  if (resp.ok) return resp.status === 204 ? null : resp.json();

  let problema = {};
  try {
    problema = await resp.json();
  } catch {
    /* respuesta sin cuerpo JSON */
  }

  if (resp.status === 401 && token) alExpirarSesion();

  throw new ApiError({
    status: resp.status,
    code: problema.code,
    detail: problema.detail,
    retryAfter: Number(resp.headers.get('Retry-After')) || undefined,
    errors: problema.errors,
    datos: problema,
  });
}

/** Mensaje y errores por campo listos para mostrar en un formulario. */
export function errorDeFormulario(e, porCodigo = {}) {
  const campos = {};
  if (e.errors) for (const [k, v] of Object.entries(e.errors)) campos[k] = [].concat(v).join(' ');
  if (porCodigo[e.code]) campos[porCodigo[e.code]] = e.message;
  return { campos, general: Object.keys(campos).length ? '' : e.message };
}
