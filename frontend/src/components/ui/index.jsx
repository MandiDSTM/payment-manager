import React from 'react';

export function Card({ children, className = '', as: Tag = 'div', ...props }) {
  return (
    <Tag className={`ui-card ${className}`.trim()} {...props}>
      {children}
    </Tag>
  );
}

export function PageHeader({ title, description, actions, children }) {
  return (
    <Card className="p-5 md:p-6 space-y-3">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-xl font-black" style={{ color: 'var(--text)' }}>{title}</h2>
          {description && <p className="text-sm ui-muted">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      {children}
    </Card>
  );
}

export function Button({
  children,
  variant = 'primary',
  className = '',
  type = 'button',
  ...props
}) {
  const variantClass = {
    primary: 'ui-btn-primary',
    secondary: 'ui-btn-secondary',
    danger: 'ui-btn-danger',
    ghost: 'ui-btn-ghost',
    paystar: 'ui-btn-paystar',
  }[variant] || 'ui-btn-primary';

  return (
    <button type={type} className={`ui-btn ${variantClass} ${className}`.trim()} {...props}>
      {children}
    </button>
  );
}

export function Field({
  label,
  children,
  className = '',
  hint,
}) {
  return (
    <div className={`flex flex-col ${className}`.trim()}>
      {label && <label className="ui-label">{label}</label>}
      {children}
      {hint && <p className="text-xs ui-muted mt-1">{hint}</p>}
    </div>
  );
}

export function TextInput({
  label,
  className = '',
  inputRef,
  onKeyDown,
  ...props
}) {
  return (
    <Field label={label} className={className}>
      <input ref={inputRef} className="ui-input" onKeyDown={onKeyDown} {...props} />
    </Field>
  );
}

export function SelectField({
  label,
  className = '',
  inputRef,
  onKeyDown,
  children,
  ...props
}) {
  return (
    <Field label={label} className={className}>
      <select ref={inputRef} className="ui-select" onKeyDown={onKeyDown} {...props}>
        {children}
      </select>
    </Field>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'جستجو...',
  inputRef,
  className = '',
}) {
  return (
    <input
      ref={inputRef}
      type="search"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={`ui-input ${className}`.trim()}
      aria-label={placeholder}
    />
  );
}

export function StatusTabs({ tabs, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          className={`ui-nav-btn ${value === tab.value ? 'active' : ''}`}
          onClick={() => onChange(tab.value)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export function DataTable({
  columns,
  rows,
  emptyText = 'موردی یافت نشد',
  rowKey = 'id',
  getRowStyle,
  onRowClick,
}) {
  return (
    <div className="ui-table-wrap">
      <table className="ui-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key || col.header}>{col.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length}>
                <div className="ui-empty">{emptyText}</div>
              </td>
            </tr>
          ) : (
            rows.map((row, idx) => (
              <tr
                key={row[rowKey] ?? idx}
                style={getRowStyle?.(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={onRowClick ? 'cursor-pointer' : undefined}
              >
                {columns.map((col) => (
                  <td key={col.key || col.header} className={col.className || ''}>
                    {col.render ? col.render(row, idx) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export function Alert({ children, variant = 'info' }) {
  const cls = {
    info: 'ui-alert-info',
    error: 'ui-alert-error',
    success: 'ui-alert-success',
  }[variant] || 'ui-alert-info';
  return <div className={`ui-alert ${cls}`}>{children}</div>;
}
