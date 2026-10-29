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
