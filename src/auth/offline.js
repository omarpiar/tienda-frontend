import { ApiError } from '../api/client';

const CLAVE = 'puntopyme.credenciales';
const ITERACIONES = 150_000;

export const normalizarUsuario = (v = '') => v.replace(/\s+/g, '').toLowerCase();

const aHex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
const deHex = (hex) => Uint8Array.from(hex.match(/.{2}/g).map((h) => parseInt(h, 16)));

async function derivar(pin, saltHex) {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: deHex(saltHex), iterations: ITERACIONES },
    material,
    256,
  );
  return aHex(bits);
}

function leer() {
  try {
    return JSON.parse(localStorage.getItem(CLAVE)) ?? {};
  } catch {
    return {};
  }
}

function guardarTodas(todas) {
  localStorage.setItem(CLAVE, JSON.stringify(todas));
}

function rolesGuardados(registro) {
  return Object.keys(registro.roles ?? {});
}

function sesionDe(guardada, rol, roles) {
  const vigente = guardada.expiraEnUtc && new Date(guardada.expiraEnUtc) > new Date();
  return {
    token: vigente ? guardada.token : null,
    expiraEnUtc: guardada.expiraEnUtc,
    usuario: { ...guardada.usuario, rol, roles },
  };
}

/** Se llama después de un login exitoso con internet. */
export async function guardarCredencial({ nombreUsuario, pin, respuesta }) {
  const todas = leer();
  const clave = normalizarUsuario(nombreUsuario);
  const salt = aHex(crypto.getRandomValues(new Uint8Array(16)));
  const previo = todas[clave]?.roles ?? {};

  todas[clave] = {
    salt,
    hash: await derivar(pin, salt),
    roles: {
      ...previo,
      [respuesta.usuario.rol]: {
        token: respuesta.token,
        expiraEnUtc: respuesta.expiraEnUtc,
        usuario: respuesta.usuario,
      },
    },
  };
  guardarTodas(todas);
}

/** Guarda el token de un rol al que se cambió con internet, sin volver a pedir el PIN. */
export function guardarRolEnDispositivo({ nombreUsuario, respuesta }) {
  const todas = leer();
  const clave = normalizarUsuario(nombreUsuario);
  const registro = todas[clave];
  if (!registro) return;

  registro.roles = {
    ...registro.roles,
    [respuesta.usuario.rol]: {
      token: respuesta.token,
      expiraEnUtc: respuesta.expiraEnUtc,
      usuario: respuesta.usuario,
    },
  };
  guardarTodas(todas);
}

/** Valida el PIN contra la huella guardada y entra con Cajero (o el primer rol guardado). */
export async function iniciarSesionSinConexion(nombreUsuario, pin) {
  const registro = leer()[normalizarUsuario(nombreUsuario)];

  if (!registro) {
    throw new ApiError({
      status: 0,
      code: 'SIN_CONEXION',
      detail: 'Sin conexión: este dispositivo aún no tiene tu acceso guardado. Inicia sesión una vez con internet.',
    });
  }

  if ((await derivar(pin, registro.salt)) !== registro.hash) {
    throw new ApiError({ status: 401, code: 'CREDENCIALES_INVALIDAS', detail: 'Usuario o PIN incorrectos' });
  }

  const roles = rolesGuardados(registro);
  if (roles.length === 0) {
    throw new ApiError({
      status: 403,
      code: 'ROL_NO_PERMITIDO',
      detail: 'Sin conexión no hay un rol guardado para este usuario en el dispositivo.',
    });
  }

  const rol = roles.includes('Cajero') ? 'Cajero' : roles[0];
  return sesionDe(registro.roles[rol], rol, roles);
}

/** Cambia de rol sin conexión solo si ese rol ya se usó antes en este dispositivo. */
export function cambiarRolSinConexion(nombreUsuario, rol) {
  const registro = leer()[normalizarUsuario(nombreUsuario)];
  const guardada = registro?.roles?.[rol];

  if (!guardada) {
    throw new ApiError({
      status: 403,
      code: 'ROL_NO_PERMITIDO',
      detail: 'Sin conexión solo puedes cambiar a un rol que ya usaste en este dispositivo.',
    });
  }

  return sesionDe(guardada, rol, rolesGuardados(registro));
}
