/** Para buscar sin importar mayúsculas ni acentos. */
export const plano = (s = '') => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
