import { useAuth } from '../auth/AuthContext';
import { useSync } from '../offline/SyncContext';
import { dinero, fechaHora } from '../format';

const ETIQUETA = {
  pendiente: { texto: 'Pendiente', clase: 'etiqueta--bajo' },
  conflicto: { texto: 'Conflicto de stock', clase: 'etiqueta--agotado' },
  error: { texto: 'Con error', clase: 'etiqueta--agotado' },
};

/** HU-07: ventas hechas sin conexión y su estado de sincronización. */
export default function PendientesPage() {
  const { sesion } = useAuth();
  const { pendientes, sincronizando, enLinea, sincronizar, reintentar, descartar } = useSync();
  const esAdmin = sesion.usuario.rol === 'Administrador';
  const porEnviar = pendientes.filter((p) => p.estado === 'pendiente').length;

  return (
    <>
      <div className="titulo-fila">
        <h2 className="titulo">Ventas pendientes</h2>
        {sesion.token && porEnviar > 0 && (
          <button className="boton boton--auto" onClick={sincronizar} disabled={sincronizando || !enLinea}>
            {sincronizando ? 'Sincronizando…' : 'Sincronizar ahora'}
          </button>
        )}
      </div>

      {!sesion.token && <p className="aviso">Entraste sin conexión. Las ventas se enviarán cuando inicies sesión con internet.</p>}

      {pendientes.length === 0 ? (
        <p className="vacio">No hay ventas pendientes. Todo está sincronizado.</p>
      ) : (
        <ul className="lista">
          {pendientes.map((v) => {
            const e = ETIQUETA[v.estado] ?? ETIQUETA.pendiente;
            const ajena = v.usuarioId !== sesion.usuario.id;
            return (
              <li key={v.idLocal} className="tarjeta">
                <div className="tarjeta__cabecera">
                  <strong>{v.vista?.folioProvisional ?? v.idLocal.slice(0, 8)}</strong>
                  <span className={`etiqueta ${e.clase}`}>{e.texto}</span>
                  <span className="tenue tarjeta__fecha">{fechaHora(v.fechaVentaUtc)}</span>
                  <strong>{dinero(v.vista?.total ?? 0)}</strong>
                </div>
                <p className="tenue">
                  {v.vista?.items?.map((i) => `${i.cantidad} × ${i.nombre}`).join(', ')} · {v.metodoPago}
                  {v.cajero ? ` · ${v.cajero}` : ''}
                </p>
                {v.error && <p className="aviso aviso--error">{v.error}{v.faltantes?.length ? ` (${v.faltantes.map((f) => `${f.nombre}: hay ${f.disponible}`).join(', ')})` : ''}</p>}
                {ajena && v.estado === 'pendiente' && <p className="tenue">Se enviará cuando {v.cajero ?? 'esa persona'} inicie sesión.</p>}

                {v.estado !== 'pendiente' && (
                  esAdmin ? (
                    <div className="acciones">
                      {sesion.token && <button className="boton boton--auto" onClick={() => reintentar(v)}>Reintentar</button>}
                      <button
                        className="boton boton--auto boton--peligro"
                        onClick={() => window.confirm('¿Descartar esta venta? No se registrará en el sistema.') && descartar(v.idLocal)}
                      >
                        Descartar
                      </button>
                    </div>
                  ) : (
                    <p className="tenue">Avisa a un administrador para resolverla.</p>
                  )
                )}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
