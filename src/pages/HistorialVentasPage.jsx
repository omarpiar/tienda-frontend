import { useEffect, useState } from 'react';
import { apiFetch } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { dinero, fechaHora } from '../format';

const TAMANO = 20;

export default function HistorialVentasPage() {
  const { sesion } = useAuth();
  const [pagina, setPagina] = useState(1);
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [abierta, setAbierta] = useState(null);

  useEffect(() => {
    let cancelado = false;
    setCargando(true);
    setError('');
    const consulta = new URLSearchParams({ pagina, tamanoPagina: TAMANO });

    apiFetch(`/api/ventas?${consulta}`, { token: sesion.token })
      .then((r) => !cancelado && setDatos(r))
      .catch((e) => {
        if (cancelado) return;
        setDatos(null);
        setError(e.code === 'SIN_CONEXION' ? 'El historial necesita conexión a internet.' : e.message);
      })
      .finally(() => !cancelado && setCargando(false));

    return () => {
      cancelado = true;
    };
  }, [pagina, sesion.token]);

  const totalPaginas = datos ? Math.max(1, Math.ceil(datos.total / datos.tamanoPagina)) : 1;

  return (
    <>
      <h2 className="titulo">Historial de ventas</h2>

      {error && <p className="aviso aviso--error" role="alert">{error}</p>}
      {cargando && !datos && <p className="tenue">Cargando ventas…</p>}
      {datos && datos.items.length === 0 && !cargando && (
        <p className="vacio">Aún no hay ventas registradas.</p>
      )}

      {datos && datos.items.length > 0 && (
        <ul className={`lista ${cargando ? 'lista--cargando' : ''}`}>
          {datos.items.map((v) => (
            <li key={v.id} className="tarjeta">
              <button
                className="venta-fila"
                aria-expanded={abierta === v.id}
                onClick={() => setAbierta(abierta === v.id ? null : v.id)}
              >
                <span className="fila__nombre">
                  <strong>{v.folio}</strong>
                  <span className="tenue">{fechaHora(v.fechaVentaUtc)} · {v.cajero}</span>
                </span>
                <span className="venta-fila__total">{dinero(v.total)}</span>
                <span className="tenue">{v.metodoPago}</span>
              </button>
              {abierta === v.id && (
                <ul className="venta-detalle">
                  {v.detalles.map((d, i) => (
                    <li key={`${d.productoId}-${i}`}>
                      <span>{d.cantidad} × {d.nombre}</span>
                      <strong>{dinero(d.subtotal)}</strong>
                    </li>
                  ))}
                  {v.montoRecibido != null && (
                    <li>
                      <span>Recibido / cambio</span>
                      <strong>{dinero(v.montoRecibido)} / {dinero(v.cambio)}</strong>
                    </li>
                  )}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}

      {datos && datos.total > 0 && (
        <footer className="paginacion">
          <span className="tenue">{datos.total} {datos.total === 1 ? 'venta' : 'ventas'}</span>
          {totalPaginas > 1 && (
            <span className="paginacion__botones">
              <button className="boton" disabled={pagina <= 1} onClick={() => setPagina((p) => p - 1)}>Anterior</button>
              <span>{pagina} de {totalPaginas}</span>
              <button className="boton" disabled={pagina >= totalPaginas} onClick={() => setPagina((p) => p + 1)}>Siguiente</button>
            </span>
          )}
        </footer>
      )}
    </>
  );
}
