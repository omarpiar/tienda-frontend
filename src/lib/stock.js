export const estadoStock = (stock, minimo) => (stock <= 0 ? 'Agotado' : stock <= minimo ? 'Bajo' : 'Normal');
