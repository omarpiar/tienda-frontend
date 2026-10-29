/**
 * Envía las ventas pendientes de una en una, en el orden en que se hicieron (HU-07).
 * Es una función pura: recibe cómo listar, guardar, borrar y enviar, así se puede probar sin navegador.
 *
 *  - Éxito (201 o 200 por idLocal repetido): la venta sale de la cola.
 *  - 409 STOCK_INSUFICIENTE: queda como "conflicto" para que el administrador la resuelva (D7).
 *  - Otro 4xx: queda como "error" con el motivo.
 *  - Sin red, sesión vencida o error 5xx: se detiene y se reintenta después.
 */
export async function sincronizarPendientes({ listar, guardar, borrar, enviar, usuarioId }) {
  const resultado = { sincronizadas: 0, conflictos: 0, errores: 0, detenida: null };

  const cola = (await listar())
    .filter((v) => v.estado === 'pendiente' && (usuarioId == null || v.usuarioId === usuarioId))
    .sort((a, b) => new Date(a.fechaVentaUtc) - new Date(b.fechaVentaUtc));

  for (const venta of cola) {
    try {
      await enviar(venta);
      await borrar(venta.idLocal);
      resultado.sincronizadas += 1;
    } catch (e) {
      if (e.code === 'SIN_CONEXION') {
        resultado.detenida = 'red';
        break;
      }
      if (e.status === 401) {
        resultado.detenida = 'sesion';
        break;
      }
      if (e.status === 409) {
        await guardar({ ...venta, estado: 'conflicto', error: e.message, faltantes: e.datos?.faltantes ?? [] });
        resultado.conflictos += 1;
        continue;
      }
      if (e.status >= 400 && e.status < 500) {
        await guardar({ ...venta, estado: 'error', error: e.message });
        resultado.errores += 1;
        continue;
      }
      resultado.detenida = 'servidor';
      break;
    }
  }
  return resultado;
}

/** Cuerpo que espera API-07. */
export const cuerpoDeVenta = (v) => ({
  idLocal: v.idLocal,
  fechaVentaUtc: v.fechaVentaUtc,
  metodoPago: v.metodoPago,
  montoRecibido: v.montoRecibido,
  detalles: v.detalles,
});
