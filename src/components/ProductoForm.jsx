import { useState } from 'react';
import { apiFetch, errorDeFormulario } from '../api/client';
import { dinero } from '../format';
import Campo from './Campo';
import Modal from './Modal';

const num = (v) => (v === '' || v == null ? null : Number(v));

/** HU-05 (alta) y HU-06 (edición). En edición no se pide stock: solo cambia al vender o recibir mercancía. */
export default function ProductoForm({ producto, token, onGuardado, onCerrar }) {
  const editando = Boolean(producto);
  const [f, setF] = useState({
    nombre: producto?.nombre ?? '',
    sku: producto?.sku ?? '',
    categoria: producto?.categoria ?? '',
    precioVenta: producto?.precioVenta ?? '',
    costoCompra: producto?.costoCompra ?? '',
    stock: '',
    stockMinimo: producto?.stockMinimo ?? 5,
  });
  const [errores, setErrores] = useState({});
  const [general, setGeneral] = useState('');
  const [guardando, setGuardando] = useState(false);

  const cambia = (campo) => (e) => setF((x) => ({ ...x, [campo]: e.target.value }));

  const precio = num(f.precioVenta);
  const costo = num(f.costoCompra) ?? 0;
  const ganancia = precio != null ? precio - costo : null;
  const margen = ganancia != null && precio > 0 ? Math.round((ganancia / precio) * 1000) / 10 : null;

  async function enviar(e) {
    e.preventDefault();
    setErrores({});
    setGeneral('');
    setGuardando(true);
    try {
      const cuerpo = {
        nombre: f.nombre, sku: f.sku, categoria: f.categoria || null,
        precioVenta: precio, costoCompra: num(f.costoCompra) ?? 0, stockMinimo: num(f.stockMinimo),
        ...(editando ? {} : { stock: num(f.stock) ?? 0 }),
      };
      const guardado = await apiFetch(editando ? `/api/productos/${producto.id}` : '/api/productos', {
        metodo: editando ? 'PUT' : 'POST', cuerpo, token,
      });
      onGuardado(guardado);
    } catch (err) {
      const { campos, general: g } = errorDeFormulario(err, { SKU_DUPLICADO: 'sku', PRECIO_MENOR_AL_COSTO: 'precioVenta' });
      setErrores(campos);
      setGeneral(g);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal titulo={editando ? 'Editar producto' : 'Agregar producto'} onCerrar={onCerrar}>
      <form onSubmit={enviar} noValidate>
        <Campo etiqueta="Nombre" error={errores.nombre}>
          <input value={f.nombre} onChange={cambia('nombre')} maxLength={150} autoFocus />
        </Campo>
        <Campo etiqueta="Código (SKU)" error={errores.sku} ayuda="El que viene en el código de barras o el que tú elijas.">
          <input value={f.sku} onChange={cambia('sku')} maxLength={50} />
        </Campo>
        <Campo etiqueta="Categoría (opcional)" error={errores.categoria}>
          <input value={f.categoria} onChange={cambia('categoria')} maxLength={100} />
        </Campo>

        <div className="rejilla">
          <Campo etiqueta="Precio de venta" error={errores.precioVenta}>
            <input type="number" inputMode="decimal" min="0" step="0.01" value={f.precioVenta} onChange={cambia('precioVenta')} />
          </Campo>
          <Campo etiqueta="Costo de compra" error={errores.costoCompra}>
            <input type="number" inputMode="decimal" min="0" step="0.01" value={f.costoCompra} onChange={cambia('costoCompra')} />
          </Campo>
        </div>
        {ganancia != null && (
          <p className="tenue ganancia">
            Ganancia por pieza: <strong>{dinero(ganancia)}</strong>
            {margen != null && <> · margen {margen} %</>}
          </p>
        )}

        <div className="rejilla">
          {!editando && (
            <Campo etiqueta="Stock inicial" error={errores.stock}>
              <input type="number" inputMode="numeric" min="0" step="1" value={f.stock} onChange={cambia('stock')} />
            </Campo>
          )}
          <Campo etiqueta="Stock mínimo" error={errores.stockMinimo} ayuda="Avisa cuando llegue a este nivel.">
            <input type="number" inputMode="numeric" min="0" step="1" value={f.stockMinimo} onChange={cambia('stockMinimo')} />
          </Campo>
        </div>

        {general && <p className="aviso aviso--error" role="alert">{general}</p>}
        <button className="boton boton--primario" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar'}</button>
      </form>
    </Modal>
  );
}
