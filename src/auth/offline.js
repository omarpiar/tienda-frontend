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
  localStorage.setItem(CLAVE, JSON.stringify(todas));
}

/** Valida el PIN contra la huella guardada. Solo permite roles ya usados con internet en este dispositivo. */
export async function iniciarSesionSinConexion(nombreUsuario, pin, rol) {
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

  const guardada = registro.roles[rol];
  if (!guardada) {
    throw new ApiError({
      status: 403,
      code: 'ROL_NO_PERMITIDO',
      detail: 'Sin conexión solo puedes entrar con un rol que ya usaste en este dispositivo.',
    });
  }

  const vigente = guardada.expiraEnUtc && new Date(guardada.expiraEnUtc) > new Date();
  return { token: vigente ? guardada.token : null, expiraEnUtc: guardada.expiraEnUtc, usuario: guardada.usuario };
}
