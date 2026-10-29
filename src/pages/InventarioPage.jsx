import { useEffect, useState } from 'react';
import { apiFetch } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { useSync } from '../offline/SyncContext';
import { guardarInventario, leerInventario } from '../inventarioCache';
import { dinero, hora } from '../format';
import StockMedidor from '../components/StockMedidor';
import ProductoDetalle from '../components/ProductoDetalle';
import ProductoForm from '../components/ProductoForm';

const TAMANO = 50;
const FILTROS = [
  { valor: 'todos', texto: 'Todos' },
  { valor: 'stockBajo', texto: 'Stock bajo' },
  { valor: 'agotados', texto: 'Agotados' },
];

function useRetardo(valor, ms) {
  const [v, setV] = useState(valor);
  useEffect(() => {
    const t = setTimeout(() => setV(valor), ms);
    return () => clearTimeout(t);
  }, [valor, ms]);
  return v;
}

export default function InventarioPage() {
  const { sesion } = useAuth();
  const { refrescarCatalogo } = useSync();
  const esAdmin = sesion.usuario.rol === 'Administrador';

  const [buscar, setBuscar] = useState('');
  const [estado, setEstado] = useState('todos');
  const [pagina, setPagina] = useState(1);
  const [recarga, setRecarga] = useState(0);
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [guardadoEn, setGuardadoEn] = useState(null); // con valor = se muestran datos guardados
  const [seleccionado, setSeleccionado] = useState(null);
  const [formulario, setFormulario] = useState(null); // { producto } | null

  const texto = useRetardo(buscar.trim(), 300);

  useEffect(() => setPagina(1), [texto, estado]);

  useEffect(() => {
    let cancelado = false;
    const consulta = new URLSearchParams({ estado, pagina, tamanoPagina: TAMANO });
    if (texto) consulta.set('buscar', texto);
    const clave = consulta.toString();

    const usarGuardado = (mensaje) => {
      const previo = leerInventario(clave);
      if (previo) {
        setDatos(previo.datos);
        setGuardadoEn(previo.guardadoEn);
        setError('');
      } else {
        setDatos(null);
        setError(mensaje);
      }
    };

    async function cargar() {
      setCargando(true);
      if (!sesion.token) {
        usarGuardado('Sin conexión y sin datos guardados para esta consulta.');
        setCargando(false);
        return;
      }
      try {
        const r = await apiFetch(`/api/productos?${clave}`, { token: sesion.token });
        if (cancelado) return;
        guardarInventario(clave, r);
        setDatos(r);
        setGuardadoEn(null);
        setError('');
      } catch (e) {
        if (cancelado) return;
        if (e.code === 'SIN_CONEXION') usarGuardado('No hay conexión y no hay datos guardados para esta consulta.');
        else setError(e.message);
      } finally {
        if (!cancelado) setCargando(false);
      }
    }

    cargar();
    return () => {
      cancelado = true;
    };
  }, [texto, estado, pagina, recarga, sesion.token]);

  const totalPaginas = datos ? Math.max(1, Math.ceil(datos.total / datos.tamanoPagina)) : 1;

  function alGuardar() {
    setFormulario(null);
    setSeleccionado(null);
    setRecarga((n) => n + 1);
    refrescarCatalogo(); // la caja ve de inmediato el cambio
  }

  return (
    <>
      <div className="titulo-fila">
        <h2 className="titulo">Inventario</h2>
        {esAdmin && sesion.token && (
          <button className="boton boton--primario boton--auto" onClick={() => setFormulario({ producto: null })}>+ Agregar producto</button>
        )}
      </div>

      {sesion.modoLocal && !sesion.token && (
        <p className="aviso">Entraste sin conexión. Verás los datos guardados en este dispositivo.</p>
      )}
      {guardadoEn && <p className="aviso">Sin conexión. Datos guardados a las {hora(guardadoEn)}.</p>}

      <div className="controles">
        <input
          className="buscador"
          type="search"
          placeholder="Buscar por nombre o código"
          value={buscar}
          onChange={(e) => setBuscar(e.target.value)}
          aria-label="Buscar producto"
        />
        <div className="segmentos" role="group" aria-label="Filtrar por estado">
          {FILTROS.map((f) => (
            <button
              key={f.valor}
              className={`segmentos__boton ${estado === f.valor ? 'segmentos__boton--activo' : ''}`}
              aria-pressed={estado === f.valor}
              onClick={() => setEstado(f.valor)}
            >
              {f.texto}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="aviso aviso--error" role="alert">{error}</p>}

      {datos && datos.items.length === 0 && !cargando && (
        <p className="vacio">
          {texto || estado !== 'todos' ? 'No hay productos con ese filtro. Prueba con otra búsqueda.' : 'Aún no hay productos registrados.'}
        </p>
      )}

      {datos && datos.items.length > 0 && (
        <ul className={`lista ${cargando ? 'lista--cargando' : ''}`}>
          {datos.items.map((p) => (
            <li key={p.id}>
              <button className="fila" onClick={() => setSeleccionado(p)}>
                <span className="fila__nombre">
                  <strong>{p.nombre}</strong>
                  <span className="tenue">{p.sku}{p.categoria ? ` · ${p.categoria}` : ''}</span>
                </span>
                <span className="fila__precio">{dinero(p.precioVenta)}</span>
                <span className="fila__stock">
                  <StockMedidor stock={p.stock} minimo={p.stockMinimo} estado={p.estadoStock} />
                  <span className="fila__cantidad">
                    {p.stock} / mín. {p.stockMinimo}
                    {p.estadoStock !== 'Normal' && <span className={`etiqueta etiqueta--${p.estadoStock.toLowerCase()}`}>{p.estadoStock}</span>}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {datos && datos.total > 0 && (
        <footer className="paginacion">
          <span className="tenue">{datos.total} {datos.total === 1 ? 'producto' : 'productos'}</span>
          {totalPaginas > 1 && (
            <span className="paginacion__botones">
              <button className="boton" disabled={pagina <= 1} onClick={() => setPagina((p) => p - 1)}>Anterior</button>
              <span>{pagina} de {totalPaginas}</span>
              <button className="boton" disabled={pagina >= totalPaginas} onClick={() => setPagina((p) => p + 1)}>Siguiente</button>
            </span>
          )}
        </footer>
      )}

      {cargando && !datos && <p className="tenue">Cargando inventario…</p>}

      {seleccionado && !formulario && (
        <ProductoDetalle
          producto={seleccionado}
          token={sesion.token}
          esAdmin={esAdmin}
          onEditar={(detalle) => setFormulario({ producto: detalle })}
          onCerrar={() => setSeleccionado(null)}
        />
      )}
      {formulario && (
        <ProductoForm producto={formulario.producto} token={sesion.token} onGuardado={alGuardar} onCerrar={() => setFormulario(null)} />
      )}
    </>
  );
}
