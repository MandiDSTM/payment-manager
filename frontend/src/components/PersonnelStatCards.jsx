import React from 'react';

export default function PersonnelStatCards({ cards, activeKey, onSelect }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((card) => {
        const active = activeKey === card.key;
        return (
          <button
            key={card.key}
            type="button"
            onClick={() => onSelect(card.key)}
            className="ui-card p-4 text-right space-y-1 transition-colors"
            style={{
              borderColor: active ? 'var(--primary)' : 'var(--border)',
              background: active ? 'var(--primary-soft)' : 'var(--surface)',
              boxShadow: active ? 'var(--shadow)' : undefined,
            }}
          >
            <div className="text-2xl font-black" style={{ color: 'var(--text)' }}>{card.count}</div>
            <div className="text-sm font-bold">{card.label}</div>
            {card.hint ? <div className="text-xs ui-muted">{card.hint}</div> : null}
          </button>
        );
      })}
    </div>
  );
}
