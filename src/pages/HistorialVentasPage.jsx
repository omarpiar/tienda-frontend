import { Fragment, useEffect, useState } from 'react';
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

  function cambiarPagina(nueva) {
    setAbierta(null);
    setPagina(nueva);
  }

  return (
    <>
      <div className="titulo-fila">
        <div>
          <h2 className="titulo">Historial de ventas</h2>
          <p className="tenue">Consulta cada transacción y despliega su detalle.</p>
        </div>
        {datos && <span className="etiqueta">{datos.total} {datos.total === 1 ? 'venta' : 'ventas'}</span>}
      </div>

      {error && <p className="aviso aviso--error" role="alert">{error}</p>}
      {cargando && !datos && <p className="tenue">Cargando ventas…</p>}
      {datos && datos.items.length === 0 && !cargando && (
        <p className="vacio">Aún no hay ventas registradas.</p>
      )}

      {datos && datos.items.length > 0 && (
        <div className={`tabla-contenedor ${cargando ? 'lista--cargando' : ''}`}>
          <table className="tabla tabla--historial">
            <thead>
              <tr>
                <th scope="col">Folio</th>
                <th scope="col">Fecha</th>
                <th scope="col">Cajero</th>
                <th scope="col">Método</th>
                <th scope="col">Total</th>
              </tr>
            </thead>
            <tbody>
              {datos.items.map((v) => (
                <Fragment key={v.id}>
                  <tr className={abierta === v.id ? 'tabla__fila--abierta' : ''}>
                    <td data-label="Folio">
                      <button
                        className="boton boton--texto venta-folio"
                        aria-expanded={abierta === v.id}
                        onClick={() => setAbierta(abierta === v.id ? null : v.id)}
                      >
                        {v.folio}
                      </button>
                    </td>
                    <td data-label="Fecha" className="tenue">{fechaHora(v.fechaVentaUtc)}</td>
                    <td data-label="Cajero">{v.cajero}</td>
                    <td data-label="Método"><span className="etiqueta">{v.metodoPago}</span></td>
                    <td data-label="Total" className="tabla__total">{dinero(v.total)}</td>
                  </tr>
                  {abierta === v.id && (
                    <tr className="tabla__detalle">
                      <td data-label="Detalle" colSpan={5} className="tabla__detalle-celda">
                        <div className="tabla__detalle-contenido">
                          <span className="tabla__detalle-titulo">Detalle de la venta</span>
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
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {datos && datos.total > 0 && (
        <footer className="paginacion">
          <span className="tenue">{datos.total} {datos.total === 1 ? 'venta' : 'ventas'}</span>
          {totalPaginas > 1 && (
            <span className="paginacion__botones">
              <button className="boton" disabled={pagina <= 1} onClick={() => cambiarPagina(pagina - 1)}>Anterior</button>
              <span>{pagina} de {totalPaginas}</span>
              <button className="boton" disabled={pagina >= totalPaginas} onClick={() => cambiarPagina(pagina + 1)}>Siguiente</button>
            </span>
          )}
        </footer>
      )}
    </>
  );
}
