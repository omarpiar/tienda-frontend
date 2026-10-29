import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { plano } from '../lib/texto';
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

  async function cambiarEstado(u) {
    const desactivar = u.activo;
    const mensaje = desactivar
      ? `¿Desactivar a ${u.nombreCompleto}? Ya no podrá iniciar sesión, pero su historial se conserva.`
      : `¿Reactivar a ${u.nombreCompleto}?`;
    if (!window.confirm(mensaje)) return;
    try {
      await apiFetch(`/api/usuarios/${u.id}/estado`, { metodo: 'PATCH', cuerpo: { activo: !u.activo }, token: sesion.token });
      await cargar();
    } catch (e) {
      setError(e.message);
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

      <ul className="lista">
        {visibles.map((u) => (
          <li key={u.id} className={`tarjeta ${u.activo ? '' : 'tarjeta--inactiva'}`}>
            <div className="tarjeta__cabecera">
              <span className="fila__nombre">
                <strong>{u.nombreCompleto}</strong>
                <span className="tenue">{u.nombreUsuario}</span>
              </span>
              <span className="etiqueta etiqueta--rol">{u.rol}</span>
              {!u.activo && <span className="etiqueta etiqueta--agotado">Inactivo</span>}
            </div>
            <div className="acciones">
              <button className="boton boton--auto" onClick={() => setFormulario({ usuario: u })}>Editar</button>
              <button className="boton boton--auto" onClick={() => cambiarEstado(u)} disabled={u.id === sesion.usuario.id && u.activo} title={u.id === sesion.usuario.id ? 'No puedes desactivar tu propia cuenta' : undefined}>
                {u.activo ? 'Desactivar' : 'Reactivar'}
              </button>
            </div>
          </li>
        ))}
      </ul>

      {formulario && (
        <UsuarioForm
          usuario={formulario.usuario}
          token={sesion.token}
          onGuardado={() => { setFormulario(null); cargar(); }}
          onCerrar={() => setFormulario(null)}
        />
      )}
    </>
  );
}
