/** Rango [desde, hasta) en UTC para el periodo elegido, calculado con el día local del dispositivo (D6). */
export function rangoDePeriodo(periodo, ahora = new Date()) {
  const y = ahora.getFullYear();
  const m = ahora.getMonth();
  const d = ahora.getDate();
  let desde;
  let hasta;

  if (periodo === 'semana') {
    const diasDesdeLunes = (ahora.getDay() + 6) % 7;
    desde = new Date(y, m, d - diasDesdeLunes);
    hasta = new Date(y, m, d - diasDesdeLunes + 7);
  } else if (periodo === 'mes') {
    desde = new Date(y, m, 1);
    hasta = new Date(y, m + 1, 1);
  } else {
    desde = new Date(y, m, d);
    hasta = new Date(y, m, d + 1);
  }
  return { desdeUtc: desde.toISOString(), hastaUtc: hasta.toISOString() };
}

export function rangoDeFechas(desde, hasta) {
  if (!desde || !hasta) return { error: 'Elige las dos fechas del periodo.' };

  const [aa, ma, da] = desde.split('-').map(Number);
  const [ah, mh, dh] = hasta.split('-').map(Number);
  if (!aa || !ma || !da || !ah || !mh || !dh) return { error: 'Elige las dos fechas del periodo.' };

  const inicio = new Date(aa, ma - 1, da);
  const fin = new Date(ah, mh - 1, dh + 1);
  if (Number.isNaN(inicio.getTime()) || Number.isNaN(fin.getTime()) || fin <= inicio)
    return { error: 'La fecha final debe ser mayor que la inicial.' };
  if ((fin - inicio) / 86400000 > 366)
    return { error: 'El rango no puede pasar de 366 días.' };

  return { desdeUtc: inicio.toISOString(), hastaUtc: fin.toISOString() };
}
