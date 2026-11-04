import { useEffect, useState } from 'react';
import { apiFetch } from '../api/client';
import { dinero, fechaHora } from '../format';
import Modal from './Modal';
import StockMedidor from './StockMedidor';

export default function ProductoDetalle({ producto, token, esAdmin, onEditar, onActualizado, onEliminado, onCerrar }) {
  const [detalle, setDetalle] = useState(null);
  const [error, setError] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [reponiendo, setReponiendo] = useState(false);
  const [historial, setHistorial] = useState(null);
  const [verHistorial, setVerHistorial] = useState(false);
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    let cancelado = false;
    if (!token) {
      setError('Sin conexión: el detalle completo no está disponible.');
      return;
    }
    apiFetch(`/api/productos/${producto.id}`, { token })
      .then((d) => !cancelado && setDetalle(d))
      .catch((e) => !cancelado && setError(e.message));
    return () => {
      cancelado = true;
    };
  }, [producto.id, token]);

  const p = detalle ?? producto;

  async function reponer(e) {
    e.preventDefault();
    setError('');
    setMensaje('');
    setReponiendo(true);
    try {
      const actualizado = await apiFetch(`/api/productos/${producto.id}/stock`, {
        metodo: 'POST', cuerpo: { cantidad: Number(cantidad) }, token,
      });
      setDetalle(actualizado);
      setCantidad('');
      setVerHistorial(false);
      setHistorial(null);
      setMensaje('Stock repuesto correctamente.');
      onActualizado?.(actualizado);
    } catch (err) {
      setError(err.message);
    } finally {
      setReponiendo(false);
    }
  }

  async function eliminar() {
    if (!window.confirm(`¿Eliminar ${p.nombre}? Dejará de aparecer en el inventario y en la caja, pero sus ventas se conservan.`)) return;
    setError('');
    try {
      await apiFetch(`/api/productos/${producto.id}`, { metodo: 'DELETE', token });
      onEliminado?.();
    } catch (err) {
      setError(err.message);
    }
  }

  async function alternarHistorial() {
    if (verHistorial) {
      setVerHistorial(false);
      return;
    }
    setVerHistorial(true);
    if (historial !== null) return;
    setError('');
    try {
      setHistorial(await apiFetch(`/api/productos/${producto.id}/historial`, { token }));
    } catch (err) {
      setError(err.message);
      setHistorial([]);
    }
  }

  return (
    <Modal titulo={p.nombre} subtitulo={`${p.sku}${p.categoria ? ` · ${p.categoria}` : ''}`} onCerrar={onCerrar}>
      <StockMedidor stock={p.stock} minimo={p.stockMinimo} estado={p.estadoStock} />
      <p className="hoja__stock">
        <strong>{p.stock}</strong> en existencia · mínimo {p.stockMinimo}
        {p.estadoStock !== 'Normal' && <span className={`etiqueta etiqueta--${p.estadoStock.toLowerCase()}`}>{p.estadoStock}</span>}
      </p>

      <dl className="datos">
        <div><dt>Precio de venta</dt><dd>{dinero(p.precioVenta)}</dd></div>
        {detalle?.costoCompra != null && (
          <>
            <div><dt>Costo de compra</dt><dd>{dinero(detalle.costoCompra)}</dd></div>
            <div><dt>Ganancia por pieza</dt><dd>{dinero(detalle.ganancia)}</dd></div>
            <div><dt>Margen sobre el precio</dt><dd>{detalle.margenPorcentaje} %</dd></div>
          </>
        )}
      </dl>

      {mensaje && <p className="aviso" role="status">{mensaje}</p>}
      {error && <p className="aviso aviso--error" role="alert">{error}</p>}

      {esAdmin && detalle && (
        <>
          <form className="reposicion" onSubmit={reponer}>
            <label className="campo">
              <span>Reponer stock</span>
              <input
                type="number"
                inputMode="numeric"
                min="1"
                step="1"
                placeholder="Cantidad"
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
              />
            </label>
            <button className="boton boton--primario boton--auto" disabled={reponiendo || !cantidad}>
              {reponiendo ? 'Reponiendo…' : 'Reponer'}
            </button>
          </form>

          <div className="acciones">
            <button className="boton boton--auto" onClick={() => onEditar(detalle)}>Editar producto</button>
            <button className="boton boton--auto" onClick={alternarHistorial}>
              {verHistorial ? 'Ocultar historial' : 'Ver historial'}
            </button>
            <button className="boton boton--auto boton--peligro" onClick={eliminar}>Eliminar producto</button>
          </div>

          {verHistorial && (
            <section className="historial">
              <h3 className="subtitulo">Historial de cambios</h3>
              {historial === null && <p className="tenue">Cargando historial…</p>}
              {historial?.length === 0 && <p className="tenue">Todavía no hay cambios registrados.</p>}
              {historial?.length > 0 && (
                <ul className="historial__lista">
                  {historial.map((h) => (
                    <li key={h.id}>
                      <div className="historial__cabecera">
                        <strong>{h.accion}</strong>
                        <span className="tenue">{fechaHora(h.fechaUtc)}</span>
                      </div>
                      <p>{h.descripcion}</p>
                      <span className="tenue">
                        {h.usuario}
                        {h.stockAnterior !== h.stockNuevo && ` · stock ${h.stockAnterior} → ${h.stockNuevo}`}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </>
      )}
    </Modal>
  );
}
