import { useEffect, useState } from 'react';
import { apiFetch } from '../api/client';
import { dinero } from '../format';
import Modal from './Modal';
import StockMedidor from './StockMedidor';

export default function ProductoDetalle({ producto, token, esAdmin, onEditar, onCerrar }) {
  const [detalle, setDetalle] = useState(null);
  const [error, setError] = useState('');

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

      {error && <p className="aviso">{error}</p>}
      {esAdmin && detalle && (
        <button className="boton boton--primario hoja__accion" onClick={() => onEditar(detalle)}>Editar producto</button>
      )}
    </Modal>
  );
}
