import React from 'react';
import api from '../api';
import { formatAmount, statusBadgeClass } from '../utils/format';

const PaymentTable = ({ data, isLocked, fetchData, selectedIds, setSelectedIds, canSelect = true }) => {
  const toggleSelect = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const toggleSelectAll = () => {
    setSelectedIds(selectedIds.length === data.length ? [] : data.map((item) => item.id));
  };

  const handleCellEdit = async (id, field, value) => {
    try {
      await api.patch(`/payments/${id}/update-field`, { field, value });
      fetchData();
    } catch (err) {
      console.error('Save failed:', err);
    }
  };

  const handleKeyDown = (e, rowIndex, colIndex) => {
    const rowCount = data.length;
    const colCount = 8;
    let nextRow = rowIndex;
    let nextCol = colIndex;

    switch (e.key) {
      case 'ArrowDown':
      case 'Enter':
        nextRow = Math.min(rowIndex + 1, rowCount - 1);
        break;
      case 'ArrowUp':
        nextRow = Math.max(rowIndex - 1, 0);
        break;
      case 'ArrowRight':
        nextCol = Math.max(colIndex - 1, 0);
        break;
      case 'ArrowLeft':
        nextCol = Math.min(colIndex + 1, colCount - 1);
        break;
      default:
        return;
    }

    e.preventDefault();
    const nextInput = document.getElementById(`input-${nextRow}-${nextCol}`);
    if (nextInput) {
      nextInput.focus();
      nextInput.select();
    }
  };

  if (data.length === 0) {
    return <div className="ui-empty">موردی یافت نشد</div>;
  }

  return (
    <div className="ui-table-wrap">
      <table className="ui-table">
        <thead>
          <tr>
            {canSelect && (
              <th className="w-10 text-center">
                <input
                  type="checkbox"
                  onChange={toggleSelectAll}
                  checked={data.length > 0 && selectedIds.length === data.length}
                />
              </th>
            )}
            <th className="text-center">کد پرسنلی</th>
            <th className="text-center">نام</th>
            <th className="text-center">نام خانوادگی</th>
            <th className="text-center">تاریخ</th>
            <th className="text-center">مبلغ (ریال)</th>
            <th className="text-center">سریال</th>
            <th className="text-center">شبا</th>
            <th className="text-center">بابت</th>
            <th className="text-center">وضعیت</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item, rowIndex) => (
            <tr
              key={item.id}
              style={selectedIds.includes(item.id) ? { background: 'var(--primary-soft)' } : undefined}
            >
              {canSelect && (
                <td className="text-center">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(item.id)}
                    onChange={() => toggleSelect(item.id)}
                  />
                </td>
              )}

              {[
                { field: 'personnel_code', value: item.personnel_code, type: 'text' },
                { field: 'first_name', value: item.first_name, type: 'text' },
                { field: 'last_name', value: item.last_name, type: 'text' },
                { field: 'date_shamsi', value: item.date_shamsi, type: 'text' },
                { field: 'amount', value: item.amount, type: 'number', amount: true },
                { field: 'serial', value: item.serial, type: 'text' },
                { field: 'sheba', value: item.sheba, type: 'text', mono: true },
                { field: 'subject', value: item.subject, type: 'text' },
              ].map((cell, colIndex) => (
                <td key={cell.field} className="text-center">
                  {isLocked ? (
                    <span className={cell.amount ? 'ui-amount' : cell.mono ? 'font-mono text-[10px]' : ''}>
                      {cell.amount ? formatAmount(cell.value) : (cell.value || '—')}
                    </span>
                  ) : (
                    <input
                      id={`input-${rowIndex}-${colIndex}`}
                      type={cell.type}
                      defaultValue={cell.value}
                      onBlur={(e) => handleCellEdit(item.id, cell.field, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, rowIndex, colIndex)}
                      className="ui-input text-center py-1 px-1"
                    />
                  )}
                </td>
              ))}

              <td className="text-center">
                <span className={statusBadgeClass(item.status)}>{item.status}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PaymentTable;
