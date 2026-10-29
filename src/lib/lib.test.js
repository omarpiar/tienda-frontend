import { describe, expect, it } from 'vitest';
import { rangoDePeriodo } from './rangos';
import { estadoStock } from './stock';
import { nuevoUuid } from './uuid';
import { plano } from './texto';

describe('rangoDePeriodo', () => {
  const miercoles = new Date(2026, 9, 28, 15, 30); // 28-oct-2026, miércoles

  it('hoy va de la medianoche local a la siguiente', () => {
    const { desdeUtc, hastaUtc } = rangoDePeriodo('hoy', miercoles);
    const d = new Date(desdeUtc);
    expect([d.getDate(), d.getHours()]).toEqual([28, 0]);
    expect(new Date(hastaUtc).getDate()).toBe(29);
  });

  it('la semana empieza en lunes y dura 7 días', () => {
    const { desdeUtc, hastaUtc } = rangoDePeriodo('semana', miercoles);
    expect(new Date(desdeUtc).getDate()).toBe(26);
    expect(new Date(hastaUtc).getDate()).toBe(2);
  });

  it('el mes va del día 1 al día 1 del mes siguiente', () => {
    const { desdeUtc, hastaUtc } = rangoDePeriodo('mes', miercoles);
    expect(new Date(desdeUtc).getDate()).toBe(1);
    expect(new Date(hastaUtc).getMonth()).toBe(10);
  });
});

describe('utilidades', () => {
  it('estadoStock sigue la regla de HU-04', () => {
    expect(estadoStock(0, 5)).toBe('Agotado');
    expect(estadoStock(5, 5)).toBe('Bajo');
    expect(estadoStock(6, 5)).toBe('Normal');
  });
  it('nuevoUuid genera identificadores distintos con formato v4', () => {
    const a = nuevoUuid();
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(nuevoUuid()).not.toBe(a);
  });
  it('plano ignora acentos y mayúsculas', () => {
    expect(plano('Panadería')).toBe('panaderia');
  });
});
