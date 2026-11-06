export default function EmptyState({ icon = '🎮', title, children }) {
  return (
    <div className="empty-state">
      <div className="empty-state__icon" aria-hidden="true">{icon}</div>
      <h3>{title}</h3>
      {children && <div className="empty-state__body">{children}</div>}
    </div>
  );
}
