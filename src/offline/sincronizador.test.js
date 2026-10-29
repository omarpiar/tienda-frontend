import { describe, expect, it } from 'vitest';
import { ApiError } from '../api/client';
import { sincronizarPendientes } from './sincronizador';

const venta = (id, minutos, extra = {}) => ({
  idLocal: id, estado: 'pendiente', usuarioId: 7,
  fechaVentaUtc: new Date(Date.UTC(2026, 9, 26, 18, minutos)).toISOString(), ...extra,
});

function montar(ventas, enviar) {
  const tabla = new Map(ventas.map((v) => [v.idLocal, v]));
  const enviadas = [];
  return {
    tabla, enviadas,
    args: {
      usuarioId: 7,
      listar: async () => [...tabla.values()],
      guardar: async (v) => tabla.set(v.idLocal, v),
      borrar: async (id) => tabla.delete(id),
      enviar: async (v) => { enviadas.push(v.idLocal); return enviar(v); },
    },
  };
}
const falla = (status, code, datos = {}) => new ApiError({ status, code, detail: `fallo ${status}`, datos });

describe('sincronizarPendientes', () => {
  it('envía en el orden en que se hicieron y vacía la cola', async () => {
    const m = montar([venta('c', 30), venta('a', 10), venta('b', 20)], async () => ({}));
    const r = await sincronizarPendientes(m.args);
    expect(m.enviadas).toEqual(['a', 'b', 'c']);
    expect(r).toEqual({ sincronizadas: 3, conflictos: 0, errores: 0, detenida: null });
    expect(m.tabla.size).toBe(0);
  });

  it('si se cae la red se detiene y conserva las que faltan', async () => {
    let n = 0;
    const m = montar([venta('a', 1), venta('b', 2), venta('c', 3)], async () => {
      if (++n === 2) throw falla(0, 'SIN_CONEXION');
    });
    const r = await sincronizarPendientes(m.args);
    expect(r.sincronizadas).toBe(1);
    expect(r.detenida).toBe('red');
    expect([...m.tabla.keys()]).toEqual(['b', 'c']);
    expect(m.enviadas).toEqual(['a', 'b']);
  });

  it('un 409 de stock deja la venta como conflicto y sigue con las demás', async () => {
    const faltantes = [{ productoId: 2, nombre: 'Aceite', disponible: 0, solicitado: 1 }];
    const m = montar([venta('a', 1), venta('b', 2)], async (v) => {
      if (v.idLocal === 'a') throw falla(409, 'STOCK_INSUFICIENTE', { faltantes });
    });
    const r = await sincronizarPendientes(m.args);
    expect(r).toMatchObject({ sincronizadas: 1, conflictos: 1 });
    expect(m.tabla.get('a')).toMatchObject({ estado: 'conflicto', faltantes });
    expect(m.tabla.has('b')).toBe(false);
  });

  it('un 400 queda como error y no se reintenta solo', async () => {
    const m = montar([venta('a', 1)], async () => { throw falla(400, 'VALIDACION'); });
    await sincronizarPendientes(m.args);
    expect(m.tabla.get('a').estado).toBe('error');
    m.enviadas.length = 0;
    await sincronizarPendientes(m.args);
    expect(m.enviadas).toEqual([]);
  });

  it('sesión vencida (401) o servidor caído (500) detienen sin marcar nada', async () => {
    for (const [status, motivo] of [[401, 'sesion'], [500, 'servidor']]) {
      const m = montar([venta('a', 1)], async () => { throw falla(status, 'X'); });
      const r = await sincronizarPendientes(m.args);
      expect(r.detenida).toBe(motivo);
      expect(m.tabla.get('a').estado).toBe('pendiente');
    }
  });

  it('solo envía las ventas del usuario con sesión', async () => {
    const m = montar([venta('mia', 1), venta('ajena', 2, { usuarioId: 9 })], async () => ({}));
    await sincronizarPendientes(m.args);
    expect(m.enviadas).toEqual(['mia']);
    expect(m.tabla.has('ajena')).toBe(true);
  });

  it('ignora las que ya están en conflicto o error', async () => {
    const m = montar([venta('a', 1, { estado: 'conflicto' })], async () => ({}));
    await sincronizarPendientes(m.args);
    expect(m.enviadas).toEqual([]);
  });
});
