import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import CategoriaForm from '../components/CategoriaForm';
import Modal from '../components/Modal';

export default function CategoriasPage() {
  const { sesion } = useAuth();
  const [categorias, setCategorias] = useState(null);
  const [error, setError] = useState('');
  const [formulario, setFormulario] = useState(null); // { categoria }
  const [confirmacion, setConfirmacion] = useState(null);
  const [errorEliminar, setErrorEliminar] = useState('');
  const [eliminando, setEliminando] = useState(false);
  const [aviso, setAviso] = useState(null);

  const cargar = useCallback(async () => {
    try {
      setCategorias(await apiFetch('/api/categorias', { token: sesion.token }));
      setError('');
    } catch (e) {
      setError(e.code === 'SIN_CONEXION' ? 'La administración de categorías necesita conexión a internet.' : e.message);
    }
  }, [sesion.token]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  function alGuardar(guardada) {
    const edito = Boolean(formulario.categoria);
    setFormulario(null);
    cargar();
    setAviso({ titulo: edito ? 'Categoría actualizada' : 'Categoría creada', mensaje: guardada.nombre });
  }

  async function eliminar() {
    setErrorEliminar('');
    setEliminando(true);
    try {
      await apiFetch(`/api/categorias/${confirmacion.id}`, { metodo: 'DELETE', token: sesion.token });
      const nombre = confirmacion.nombre;
      setConfirmacion(null);
      await cargar();
      setAviso({ titulo: 'Categoría eliminada', mensaje: nombre });
    } catch (e) {
      setErrorEliminar(e.message);
    } finally {
      setEliminando(false);
    }
  }

  return (
    <>
      <div className="titulo-fila">
        <h2 className="titulo">Categorías</h2>
        <button className="boton boton--primario boton--auto" onClick={() => setFormulario({ categoria: null })}>
          + Nueva categoría
        </button>
      </div>

      {error && <p className="aviso aviso--error" role="alert">{error}</p>}

      {categorias && categorias.length === 0 && (
        <p className="vacio">Aún no hay categorías. Crea la primera para clasificar tus productos.</p>
      )}

      {categorias && categorias.length > 0 && (
        <div className="tabla-contenedor tabla-contenedor--categorias">
          <table className="tabla">
            <thead>
              <tr>
                <th scope="col">Categoría</th>
                <th scope="col">Productos</th>
                <th scope="col">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {categorias.map((c) => (
                <tr key={c.id}>
                  <td data-label="Categoría">
                    <span className="tabla__nombre"><strong>{c.nombre}</strong></span>
                  </td>
                  <td data-label="Productos">{c.productos} {c.productos === 1 ? 'producto' : 'productos'}</td>
                  <td data-label="Acciones">
                    <div className="tabla__acciones">
                      <button className="boton boton--auto" onClick={() => setFormulario({ categoria: c })}>Editar</button>
                      <button className="boton boton--auto boton--peligro" onClick={() => { setErrorEliminar(''); setConfirmacion(c); }}>Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {formulario && (
        <CategoriaForm
          categoria={formulario.categoria}
          token={sesion.token}
          onGuardado={alGuardar}
          onCerrar={() => setFormulario(null)}
        />
      )}

      {confirmacion && (
        <Modal titulo="Eliminar categoría" subtitulo="Esta acción no se puede deshacer." onCerrar={() => setConfirmacion(null)}>
          <p>¿Eliminar la categoría <strong>{confirmacion.nombre}</strong>? Solo se puede si no tiene productos asignados.</p>
          {errorEliminar && <p className="aviso aviso--error" role="alert">{errorEliminar}</p>}
          <div className="acciones hoja__accion">
            <button className="boton boton--auto" onClick={() => setConfirmacion(null)}>Cancelar</button>
            <button className="boton boton--auto boton--peligro" onClick={eliminar} disabled={eliminando}>
              {eliminando ? 'Eliminando…' : 'Eliminar'}
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
