import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { plano } from '../lib/texto';
import Modal from '../components/Modal';
import UsuarioForm from '../components/UsuarioForm';

const ESTADOS = [
  { valor: 'todos', texto: 'Todos' },
  { valor: 'activos', texto: 'Activos' },
  { valor: 'inactivos', texto: 'Inactivos' },
];

/** HU-09 (agregar) y HU-10 (editar o desactivar). */
export default function UsuariosPage() {
  const { sesion } = useAuth();
  const [usuarios, setUsuarios] = useState(null);
  const [error, setError] = useState('');
  const [buscar, setBuscar] = useState('');
  const [rol, setRol] = useState('');
  const [estado, setEstado] = useState('todos');
  const [formulario, setFormulario] = useState(null); // { usuario }
  const [confirmacion, setConfirmacion] = useState(null);
  const [errorEstado, setErrorEstado] = useState('');
  const [cambiando, setCambiando] = useState(false);
  const [aviso, setAviso] = useState(null);

  const cargar = useCallback(async () => {
    try {
      setUsuarios(await apiFetch('/api/usuarios', { token: sesion.token }));
      setError('');
    } catch (e) {
      setError(e.code === 'SIN_CONEXION' ? 'La administración de usuarios necesita conexión a internet.' : e.message);
    }
  }, [sesion.token]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const visibles = useMemo(() => {
    const q = plano(buscar.trim());
    return (usuarios ?? []).filter(
      (u) =>
        (!q || plano(u.nombreCompleto).includes(q) || u.nombreUsuario.includes(q)) &&
        (!rol || u.rol === rol) &&
        (estado === 'todos' || (estado === 'activos' ? u.activo : !u.activo)),
    );
  }, [usuarios, buscar, rol, estado]);

  const activos = usuarios?.filter((u) => u.activo).length ?? 0;

  function alGuardar(guardado) {
    const edito = Boolean(formulario.usuario);
    setFormulario(null);
    cargar();
    setAviso({ titulo: edito ? 'Usuario actualizado' : 'Usuario creado', mensaje: guardado.nombreCompleto });
  }

  function cambiarEstado(u) {
    if (u.activo && u.id === sesion.usuario.id) return;
    setErrorEstado('');
    setConfirmacion(u);
  }

  async function confirmarCambioEstado() {
    const u = confirmacion;
    setErrorEstado('');
    setCambiando(true);
    try {
      await apiFetch(`/api/usuarios/${u.id}/estado`, {
        metodo: 'PATCH',
        cuerpo: { activo: !u.activo },
        token: sesion.token,
      });
      setConfirmacion(null);
      await cargar();
      setAviso({ titulo: u.activo ? 'Usuario desactivado' : 'Usuario reactivado', mensaje: u.nombreCompleto });
    } catch (e) {
      setErrorEstado(e.message);
    } finally {
      setCambiando(false);
    }
  }

  return (
    <>
      <div className="titulo-fila">
        <h2 className="titulo">Usuarios</h2>
        <button className="boton boton--primario boton--auto" onClick={() => setFormulario({ usuario: null })}>+ Nuevo usuario</button>
      </div>

      {usuarios && <p className="tenue">{activos} activos · {usuarios.length - activos} inactivos</p>}
      {error && <p className="aviso aviso--error" role="alert">{error}</p>}

      <div className="controles">
        <input className="buscador" type="search" placeholder="Buscar por nombre o usuario" value={buscar} onChange={(e) => setBuscar(e.target.value)} aria-label="Buscar usuario" />
        <div className="filtros">
          <div className="segmentos" role="group" aria-label="Estado">
            {ESTADOS.map((e) => (
              <button key={e.valor} className={`segmentos__boton ${estado === e.valor ? 'segmentos__boton--activo' : ''}`} aria-pressed={estado === e.valor} onClick={() => setEstado(e.valor)}>{e.texto}</button>
            ))}
          </div>
          <select className="selector" value={rol} onChange={(e) => setRol(e.target.value)} aria-label="Filtrar por rol">
            <option value="">Todos los roles</option>
            <option>Administrador</option>
            <option>Cajero</option>
          </select>
        </div>
      </div>

      {usuarios && visibles.length === 0 && <p className="vacio">No hay usuarios con ese filtro.</p>}

      {usuarios && visibles.length > 0 && (
        <div className="tabla-contenedor">
          <table className="tabla">
            <thead>
              <tr>
                <th scope="col">Usuario</th>
                <th scope="col">Rol</th>
                <th scope="col">Estado</th>
                <th scope="col">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((u) => (
                <tr key={u.id} className={u.activo ? '' : 'tabla__fila--inactiva'}>
                  <td data-label="Usuario">
                    <span className="tabla__nombre">
                      <strong>{u.nombreCompleto}</strong>
                      <span className="tenue">{u.nombreUsuario}</span>
                    </span>
                  </td>
                  <td data-label="Rol"><span className="etiqueta etiqueta--rol">{u.rol}</span></td>
                  <td data-label="Estado">
                    {u.activo ? <span className="etiqueta">Activo</span> : <span className="etiqueta etiqueta--agotado">Inactivo</span>}
                  </td>
                  <td data-label="Acciones">
                    <div className="tabla__acciones">
                      <button className="boton boton--auto" onClick={() => setFormulario({ usuario: u })}>Editar</button>
                      <button
                        className={`boton boton--auto ${u.activo ? 'boton--peligro' : ''}`}
                        onClick={() => cambiarEstado(u)}
                        disabled={u.id === sesion.usuario.id && u.activo}
                        title={u.id === sesion.usuario.id ? 'No puedes desactivar tu propia cuenta' : undefined}
                      >
                        {u.activo ? 'Desactivar' : 'Reactivar'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {formulario && (
        <UsuarioForm
          usuario={formulario.usuario}
          token={sesion.token}
          onGuardado={alGuardar}
          onCerrar={() => setFormulario(null)}
        />
      )}

      {confirmacion && (
        <Modal
          titulo={confirmacion.activo ? 'Desactivar usuario' : 'Reactivar usuario'}
          subtitulo="El historial del usuario se conserva."
          onCerrar={() => setConfirmacion(null)}
        >
          <p>
            ¿{confirmacion.activo ? 'Desactivar a' : 'Reactivar a'} <strong>{confirmacion.nombreCompleto}</strong>?
            {' '}{confirmacion.activo ? 'Ya no podrá iniciar sesión.' : 'Podrá volver a entrar con su usuario y PIN.'}
          </p>
          {errorEstado && <p className="aviso aviso--error" role="alert">{errorEstado}</p>}
          <div className="acciones hoja__accion">
            <button className="boton boton--auto" onClick={() => setConfirmacion(null)}>Cancelar</button>
            <button
              className={`boton boton--auto ${confirmacion.activo ? 'boton--peligro' : 'boton--primario'}`}
              onClick={confirmarCambioEstado}
              disabled={cambiando}
            >
              {cambiando ? 'Guardando…' : confirmacion.activo ? 'Desactivar' : 'Reactivar'}
            </button>
          </div>
        </Modal>
      )}

      {aviso && (
        <Modal titulo={aviso.titulo} onCerrar={() => setAviso(null)}>
          <p className="confirmacion" role="status"><strong>{aviso.mensaje}</strong></p>
          <button className="boton boton--primario hoja__accion" onClick={() => setAviso(null)}>Aceptar</button>
        </Modal>
      )}
    </>
  );
}
