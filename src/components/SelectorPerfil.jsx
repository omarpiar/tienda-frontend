import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { IconoCheck, IconoCerrarSesion, IconoChevron, IconoEscudo, IconoPersona } from './Iconos';

const ICONOS = { Administrador: IconoEscudo, Cajero: IconoPersona };

const iniciales = (nombre = '') =>
  nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();

export default function SelectorPerfil() {
  const { sesion, cambiarRol, cerrarSesion } = useAuth();
  const [abierto, setAbierto] = useState(false);
  const [cambiando, setCambiando] = useState('');
  const [error, setError] = useState('');
  const caja = useRef(null);

  useEffect(() => {
    if (!abierto) return;
    const alClicFuera = (e) => {
      if (!caja.current?.contains(e.target)) setAbierto(false);
    };
    const alTeclear = (e) => {
      if (e.key === 'Escape') setAbierto(false);
    };
    document.addEventListener('mousedown', alClicFuera);
    document.addEventListener('keydown', alTeclear);
    return () => {
      document.removeEventListener('mousedown', alClicFuera);
      document.removeEventListener('keydown', alTeclear);
    };
  }, [abierto]);

  const usuario = sesion.usuario;
  const rol = usuario.rol;
  const roles = usuario.roles?.length ? usuario.roles : [rol];

  async function elegir(nuevo) {
    setError('');
    if (nuevo === rol) {
      setAbierto(false);
      return;
    }
    setCambiando(nuevo);
    try {
      await cambiarRol(nuevo);
      setAbierto(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setCambiando('');
    }
  }

  return (
    <div className="perfil" ref={caja}>
      <button
        type="button"
        className="perfil__boton"
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-label={`Cuenta de ${usuario.nombreCompleto}. Cambiar de perfil`}
        onClick={() => {
          setAbierto((v) => !v);
          setError('');
        }}
      >
        <span className={`avatar avatar--${rol.toLowerCase()}`}>{iniciales(usuario.nombreCompleto)}</span>
        <span className="perfil__datos">
          <strong>{usuario.nombreCompleto}</strong>
          <span>{rol}</span>
        </span>
        <IconoChevron className="perfil__chevron" size={16} />
      </button>

      {abierto && (
        <div className="perfil__menu" role="menu" aria-label="Cambiar de perfil">
          <p className="perfil__menu-titulo">Cambiar de perfil</p>
          {roles.map((r) => {
            const Icono = ICONOS[r] ?? IconoPersona;
            const activo = r === rol;
            return (
              <button
                type="button"
                key={r}
                role="menuitemradio"
                aria-checked={activo}
                className={`perfil__opcion ${activo ? 'perfil__opcion--activa' : ''}`}
                disabled={Boolean(cambiando)}
                onClick={() => elegir(r)}
              >
                <span className={`perfil__icono perfil__icono--${r.toLowerCase()}`}>
                  <Icono size={19} />
                </span>
                <span className="perfil__opcion-texto">
                  <strong>{r}</strong>
                  <span>{r === 'Administrador' ? 'Acceso total al negocio' : 'Ventas y consultas'}</span>
                </span>
                {cambiando === r ? (
                  <span className="perfil__cargando" aria-hidden="true" />
                ) : activo ? (
                  <span className="perfil__check">
                    <IconoCheck size={18} />
                  </span>
                ) : null}
              </button>
            );
          })}

          {error && <p className="perfil__error" role="alert">{error}</p>}

          <div className="perfil__separador" />
          <button type="button" className="perfil__salir" role="menuitem" onClick={cerrarSesion}>
            <IconoCerrarSesion size={18} />
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}
