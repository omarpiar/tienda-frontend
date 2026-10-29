/** Barra de stock con una marca en el nivel mínimo: se ve de un vistazo qué tan cerca está de agotarse. */
export default function StockMedidor({ stock, minimo, estado }) {
  const tope = Math.max(stock, minimo * 2, 1);
  const relleno = Math.min(100, (stock / tope) * 100);
  const marca = Math.min(100, (minimo / tope) * 100);

  return (
    <div className={`medidor medidor--${estado.toLowerCase()}`}>
      <div className="medidor__pista" role="img" aria-label={`Stock ${stock}, mínimo ${minimo}`}>
        <div className="medidor__relleno" style={{ width: `${relleno}%` }} />
        <div className="medidor__minimo" style={{ left: `${marca}%` }} />
      </div>
    </div>
  );
}
