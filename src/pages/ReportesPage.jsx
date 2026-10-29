import { useEffect, useState } from 'react';
import { apiFetch } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { dinero } from '../format';
import { rangoDePeriodo } from '../lib/rangos';

const PERIODOS = [
  { valor: 'hoy', texto: 'Hoy' },
  { valor: 'semana', texto: 'Semana' },
  { valor: 'mes', texto: 'Mes' },
];

/** HU-08: ventas totales, ticket promedio y productos más vendidos. */
export default function ReportesPage() {
  const { sesion } = useAuth();
  const [periodo, setPeriodo] = useState('hoy');
  const [reporte, setReporte] = useState(null);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let cancelado = false;
    setCargando(true);
    setError('');
    const { desdeUtc, hastaUtc } = rangoDePeriodo(periodo);

    apiFetch(`/api/reportes/ventas?${new URLSearchParams({ desdeUtc, hastaUtc })}`, { token: sesion.token })
      .then((r) => !cancelado && setReporte(r))
      .catch((e) => {
        if (cancelado) return;
        setReporte(null);
        setError(e.code === 'SIN_CONEXION' ? 'Los reportes necesitan conexión a internet.' : e.message);
      })
      .finally(() => !cancelado && setCargando(false));

    return () => {
      cancelado = true;
    };
  }, [periodo, sesion.token]);

  const maximo = Math.max(1, ...(reporte?.productosMasVendidos.map((p) => p.cantidadVendida) ?? [1]));

  return (
    <>
      <h2 className="titulo">Reportes</h2>

      <div className="segmentos" role="group" aria-label="Periodo">
        {PERIODOS.map((p) => (
          <button key={p.valor} className={`segmentos__boton ${periodo === p.valor ? 'segmentos__boton--activo' : ''}`} aria-pressed={periodo === p.valor} onClick={() => setPeriodo(p.valor)}>
            {p.texto}
          </button>
        ))}
      </div>

      {error && <p className="aviso aviso--error" role="alert">{error}</p>}
      {cargando && !reporte && <p className="tenue">Calculando…</p>}

      {reporte && (
        <div className={cargando ? 'lista--cargando' : ''}>
          <div className="kpis">
            <div className="kpi"><span className="tenue">Ventas totales</span><strong>{dinero(reporte.totalVentas)}</strong></div>
            <div className="kpi"><span className="tenue">Transacciones</span><strong>{reporte.numeroTransacciones}</strong></div>
            <div className="kpi"><span className="tenue">Ticket promedio</span><strong>{dinero(reporte.ticketPromedio)}</strong></div>
          </div>

          <h3 className="subtitulo">Productos más vendidos</h3>
          {reporte.productosMasVendidos.length === 0 ? (
            <p className="vacio">Aún no hay ventas en este periodo.</p>
          ) : (
            <ol className="ranking">
              {reporte.productosMasVendidos.map((p, i) => (
                <li key={p.productoId}>
                  <span className="ranking__nombre">{i + 1}. {p.nombre}</span>
                  <span className="ranking__barra"><span style={{ width: `${(p.cantidadVendida / maximo) * 100}%` }} /></span>
                  <strong className="ranking__cant">{p.cantidadVendida} pzas</strong>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </>
  );
}
