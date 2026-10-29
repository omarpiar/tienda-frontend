import { useMemo, useState } from 'react';
import { apiFetch } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { useSync } from '../offline/SyncContext';
import { dinero } from '../format';
import { nuevoUuid } from '../lib/uuid';
import { plano } from '../lib/texto';

const MAX_RESULTADOS = 8;

/** HU-02 (agregar productos a la venta) y HU-03 (cobrar). Funciona con el catálogo guardado en el dispositivo (HU-07). */
export default function VentaPage() {
  const { sesion } = useAuth();
  const { enLinea, catalogo, registrarPendiente, refrescarCatalogo } = useSync();

  const [busqueda, setBusqueda] = useState('');
  const [carrito, setCarrito] = useState([]); // [{ producto, cantidad }]
  const [metodo, setMetodo] = useState('Efectivo');
  const [recibido, setRecibido] = useState('');
  const [error, setError] = useState('');
  const [cobrando, setCobrando] = useState(false);
  const [resultado, setResultado] = useState(null);

  const productos = catalogo?.productos ?? [];
  const total = carrito.reduce((s, l) => s + l.producto.precioVenta * l.cantidad, 0);
  const piezas = carrito.reduce((s, l) => s + l.cantidad, 0);
  const recibidoNum = Number(recibido);
  const cambio = metodo === 'Efectivo' && recibido !== '' ? recibidoNum - total : null;
  const puedeCobrar = carrito.length > 0 && !cobrando && (metodo === 'Tarjeta' || (recibido !== '' && recibidoNum >= total));

  const resultados = useMemo(() => {
    const q = plano(busqueda.trim());
    const lista = q ? productos.filter((p) => plano(p.nombre).includes(q) || plano(p.sku).includes(q)) : productos;
    return lista.slice(0, MAX_RESULTADOS);
  }, [busqueda, productos]);

  const cantidadEnCarrito = (id) => carrito.find((l) => l.producto.id === id)?.cantidad ?? 0;

  function agregar(producto) {
    setError('');
    setResultado(null);
    if (cantidadEnCarrito(producto.id) >= producto.stock) {
      setError(`Solo hay ${producto.stock} de ${producto.nombre}.`);
      return;
    }
    setCarrito((c) =>
      c.some((l) => l.producto.id === producto.id)
        ? c.map((l) => (l.producto.id === producto.id ? { ...l, cantidad: l.cantidad + 1 } : l))
        : [...c, { producto, cantidad: 1 }],
    );
  }

  function cambiarCantidad(id, delta) {
    setError('');
    setCarrito((c) =>
      c
        .map((l) => {
          if (l.producto.id !== id) return l;
          const cantidad = Math.min(l.cantidad + delta, l.producto.stock);
          return { ...l, cantidad };
        })
        .filter((l) => l.cantidad > 0),
    );
  }

  // Un escáner escribe el código y manda Enter: coincidencia exacta de SKU, o el único resultado.
  function alBuscar(e) {
    e.preventDefault();
    const q = busqueda.trim().toLowerCase();
    if (!q) return;
    const exacto = productos.find((p) => p.sku.toLowerCase() === q);
    const elegido = exacto ?? (resultados.length === 1 ? resultados[0] : null);
    if (elegido) {
      agregar(elegido);
      setBusqueda('');
    } else if (resultados.length === 0) {
      setError('No encontramos ese producto.');
    }
  }

  async function cobrar() {
    setError('');
    setCobrando(true);

    const detalles = carrito.map((l) => ({ productoId: l.producto.id, cantidad: l.cantidad }));
    const venta = {
      idLocal: nuevoUuid(),
      fechaVentaUtc: new Date().toISOString(),
      metodoPago: metodo,
      montoRecibido: metodo === 'Efectivo' ? recibidoNum : null,
      detalles,
    };

    try {
      if (sesion.token && enLinea) {
        try {
          const guardada = await apiFetch('/api/ventas', { metodo: 'POST', cuerpo: venta, token: sesion.token });
          setResultado({ tipo: 'ok', folio: guardada.folio, total: guardada.total, cambio: guardada.cambio });
          limpiar();
          refrescarCatalogo();
          return;
        } catch (e) {
          if (e.code !== 'SIN_CONEXION') {
            const faltantes = e.datos?.faltantes;
            setError(
              faltantes?.length
                ? `Sin existencias suficientes: ${faltantes.map((f) => `${f.nombre} (hay ${f.disponible})`).join(', ')}.`
                : e.message,
            );
            if (e.code === 'STOCK_INSUFICIENTE' || e.code === 'PRODUCTO_NO_ENCONTRADO') refrescarCatalogo();
            return;
          }
          // sin conexión: cae al guardado local
        }
      }

      const folioProvisional = venta.idLocal.slice(0, 8).toUpperCase();
      await registrarPendiente({
        ...venta,
        estado: 'pendiente',
        usuarioId: sesion.usuario.id,
        cajero: sesion.usuario.nombreCompleto,
        vista: {
          folioProvisional,
          total,
          cambio,
          items: carrito.map((l) => ({ nombre: l.producto.nombre, cantidad: l.cantidad, precio: l.producto.precioVenta })),
        },
      });
      setResultado({ tipo: 'offline', folio: folioProvisional, total, cambio });
      limpiar();
    } finally {
      setCobrando(false);
    }
  }

  function limpiar() {
    setCarrito([]);
    setRecibido('');
    setBusqueda('');
  }

  if (!catalogo) {
    return (
      <>
        <h2 className="titulo">Nueva venta</h2>
        <p className="aviso">
          {sesion.token
            ? 'Descargando el catálogo de productos…'
            : 'Este dispositivo todavía no tiene el catálogo. Entra una vez con internet para poder vender sin conexión.'}
        </p>
      </>
    );
  }

  return (
    <>
      <h2 className="titulo">Nueva venta</h2>

      {!enLinea && <p className="aviso">Sin conexión: las ventas se guardan en este dispositivo y se envían solas al volver el internet.</p>}

      {resultado && (
        <div className={`confirmacion ${resultado.tipo === 'ok' ? '' : 'confirmacion--local'}`} role="status">
          <strong>
            {resultado.tipo === 'ok' ? `Venta registrada · ${resultado.folio}` : `Venta guardada sin conexión · ${resultado.folio}`}
          </strong>
          <span>Total {dinero(resultado.total)}{resultado.cambio != null && resultado.cambio > 0 ? ` · Cambio ${dinero(resultado.cambio)}` : ''}</span>
          {resultado.tipo === 'offline' && <span className="tenue">Se sincronizará automáticamente. Ese folio es provisional.</span>}
        </div>
      )}

      <div className="venta">
        <section className="venta__buscar">
          <form onSubmit={alBuscar}>
            <input
              className="buscador"
              type="search"
              placeholder="Buscar producto o escanear código"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              aria-label="Buscar producto o escanear código"
              autoFocus
            />
          </form>

          <ul className="lista lista--compacta">
            {resultados.map((p) => {
              const enCarrito = cantidadEnCarrito(p.id);
              const sinStock = p.stock - enCarrito <= 0;
              return (
                <li key={p.id}>
                  <button className="producto" onClick={() => agregar(p)} disabled={sinStock}>
                    <span className="producto__nombre">
                      <strong>{p.nombre}</strong>
                      <span className="tenue">
                        {sinStock ? (p.stock === 0 ? 'Agotado' : 'Ya agregaste todo el stock') : p.estadoStock === 'Bajo' ? `Quedan ${p.stock}` : `${p.stock} en existencia`}
                      </span>
                    </span>
                    <span className="fila__precio">{dinero(p.precioVenta)}</span>
                  </button>
                </li>
              );
            })}
            {resultados.length === 0 && <li className="vacio">Sin resultados.</li>}
          </ul>
        </section>

        <section className="venta__carrito" aria-label="Carrito">
          <h3 className="subtitulo">Carrito ({piezas} {piezas === 1 ? 'producto' : 'productos'})</h3>

          {carrito.length === 0 ? (
            <p className="vacio">Agrega productos para empezar.</p>
          ) : (
            <ul className="carrito">
              {carrito.map((l) => (
                <li key={l.producto.id} className="carrito__linea">
                  <span className="carrito__nombre">
                    <strong>{l.producto.nombre}</strong>
                    <span className="tenue">{dinero(l.producto.precioVenta)} c/u</span>
                  </span>
                  <span className="cantidad">
                    <button className="boton boton--mini" onClick={() => cambiarCantidad(l.producto.id, -1)} aria-label={`Quitar uno de ${l.producto.nombre}`}>−</button>
                    <span aria-live="polite">{l.cantidad}</span>
                    <button className="boton boton--mini" onClick={() => cambiarCantidad(l.producto.id, 1)} disabled={l.cantidad >= l.producto.stock} aria-label={`Agregar uno de ${l.producto.nombre}`}>+</button>
                  </span>
                  <span className="carrito__subtotal">{dinero(l.producto.precioVenta * l.cantidad)}</span>
                </li>
              ))}
            </ul>
          )}

          <p className="total">Total <strong>{dinero(total)}</strong></p>

          <div className="segmentos" role="group" aria-label="Método de pago">
            {['Efectivo', 'Tarjeta'].map((m) => (
              <button key={m} className={`segmentos__boton ${metodo === m ? 'segmentos__boton--activo' : ''}`} aria-pressed={metodo === m} onClick={() => setMetodo(m)}>
                {m}
              </button>
            ))}
          </div>

          {metodo === 'Efectivo' && (
            <label className="campo campo--cobro">
              <span>Recibido</span>
              <input type="number" inputMode="decimal" min="0" step="0.01" value={recibido} onChange={(e) => setRecibido(e.target.value)} />
              {cambio != null && (
                <small className={cambio < 0 ? 'campo__error' : ''}>
                  {cambio < 0 ? `Faltan ${dinero(-cambio)}` : `Cambio ${dinero(cambio)}`}
                </small>
              )}
            </label>
          )}

          {error && <p className="aviso aviso--error" role="alert">{error}</p>}

          <button className="boton boton--primario boton--cobrar" disabled={!puedeCobrar} onClick={cobrar}>
            {cobrando ? 'Cobrando…' : 'COBRAR'}
          </button>
        </section>
      </div>
    </>
  );
}
