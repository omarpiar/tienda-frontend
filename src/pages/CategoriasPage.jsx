import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import CategoriaForm from '../components/CategoriaForm';

export default function CategoriasPage() {
  const { sesion } = useAuth();
  const [categorias, setCategorias] = useState(null);
  const [error, setError] = useState('');
  const [formulario, setFormulario] = useState(null); // { categoria }

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

  async function eliminar(categoria) {
    if (!window.confirm(`¿Eliminar la categoría ${categoria.nombre}?`)) return;
    setError('');
    try {
      await apiFetch(`/api/categorias/${categoria.id}`, { metodo: 'DELETE', token: sesion.token });
      await cargar();
    } catch (e) {
      setError(e.message);
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

      <ul className="lista">
        {(categorias ?? []).map((c) => (
          <li key={c.id} className="tarjeta">
            <div className="tarjeta__cabecera">
              <span className="fila__nombre">
                <strong>{c.nombre}</strong>
                <span className="tenue">{c.productos} {c.productos === 1 ? 'producto' : 'productos'}</span>
              </span>
            </div>
            <div className="acciones">
              <button className="boton boton--auto" onClick={() => setFormulario({ categoria: c })}>Editar</button>
              <button className="boton boton--auto boton--peligro" onClick={() => eliminar(c)}>Eliminar</button>
            </div>
          </li>
        ))}
      </ul>

      {formulario && (
        <CategoriaForm
          categoria={formulario.categoria}
          token={sesion.token}
          onGuardado={() => { setFormulario(null); cargar(); }}
          onCerrar={() => setFormulario(null)}
        />
      )}
    </>
  );
}
