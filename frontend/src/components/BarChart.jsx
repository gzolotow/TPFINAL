// Gráfico de barras horizontal hecho con CSS (sin librerías).
// data: [{ label, value, color? }]
export default function BarChart({ data, unit = '', emptyText = 'Sin datos todavía' }) {
  const max = Math.max(...data.map((item) => item.value), 0);
  if (max === 0) return <p className="muted small">{emptyText}</p>;

  return (
    <ul className="bar-chart">
      {data.map((item) => (
        <li key={item.label} className="bar-chart__row">
          <span className="bar-chart__label">{item.label}</span>
          <span className="bar-chart__track">
            <span
              className="bar-chart__bar"
              style={{ width: `${(item.value / max) * 100}%`, background: item.color }}
            />
          </span>
          <span className="bar-chart__value">{item.value}{unit}</span>
        </li>
      ))}
    </ul>
  );
}
