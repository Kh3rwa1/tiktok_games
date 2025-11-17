import './StatCard.css';

const StatCard = ({ title, value, icon: Icon, color = 'neon-pink', trend, subtitle }) => {
  return (
    <div className={`stat-card stat-card-${color}`}>
      <div className="stat-card-header">
        <div className="stat-card-icon">
          {Icon && <Icon size={28} />}
        </div>
        <h3 className="stat-card-title">{title}</h3>
      </div>

      <div className="stat-card-body">
        <div className="stat-card-value">{value}</div>
        {subtitle && <div className="stat-card-subtitle">{subtitle}</div>}
        {trend && (
          <div className={`stat-card-trend ${trend.direction}`}>
            <span className="trend-arrow">
              {trend.direction === 'up' ? '↑' : '↓'}
            </span>
            <span className="trend-value">{trend.value}%</span>
            <span className="trend-label">{trend.label}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default StatCard;
