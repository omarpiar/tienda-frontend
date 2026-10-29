const moneda = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
export const dinero = (n) => moneda.format(n);
export const hora = (iso) => new Date(iso).toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit' });
export const fechaHora = (iso) =>
  new Date(iso).toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
