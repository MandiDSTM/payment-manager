import React, { useState, useEffect, useRef } from 'react';
import api, { isAdmin } from '../api';
import {
  Button, Card, DataTable, PageHeader, SearchInput, SelectField, TextInput,
} from '../components/ui';
import { useFormKeyboardNav } from '../hooks/useFormKeyboardNav';
import { statusBadgeClass } from '../utils/format';
import { downloadFormattedExcel, formatExportDate } from '../utils/excelExport';

const STATUS_OPTIONS = ['فرم خام', 'در انتظار پرداخت', 'باطل‌شده', 'پرداخت شده'];

const getNextSerialNumber = (lastSerialNumber) => {
  const str = String(lastSerialNumber ?? '').trim();
  const match = str.match(/^(.*?)(\d+)$/);
  if (!match) return '';
  const prefix = match[1];
  const digits = match[2];
  const width = digits.length;
  const nextNum = BigInt(digits) + 1n;
  return `${prefix}${nextNum.toString().padStart(width, '0')}`;
};

function PermissionSerialsPage() {
  const [serials, setSerials] = useState([]);
  const [users, setUsers] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [usageFilter, setUsageFilter] = useState('');
  const [recipientFilter, setRecipientFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [form, setForm] = useState({ serial_number: '', recipient_user_id: '', quantity: 1 });
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const searchRef = useRef(null);

  const fetchData = async () => {
    const params = {};
    if (statusFilter) params.status = statusFilter;
    if (usageFilter) params.usage_location = usageFilter;
    if (recipientFilter) params.recipient_user_id = recipientFilter;
    const [s, u] = await Promise.all([
      api.get('/permission-serials', { params }),
      api.get('/users'),
    ]);
    setSerials(s.data.data || []);
    setUsers(u.data.data || []);
  };

  useEffect(() => { fetchData(); }, [statusFilter, usageFilter, recipientFilter]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const filtered = serials.filter((s) =>
    [s.serial_number, s.recipient_name, s.usage_location, s.status]
      .join(' ')
      .toLowerCase()
      .includes(searchTerm.toLowerCase()),
  );

  const dashboardCounts = {
    total: filtered.length,
    raw: filtered.filter((s) => s.status === 'فرم خام').length,
    awaiting: filtered.filter((s) => s.status === 'در انتظار پرداخت').length,
    voided: filtered.filter((s) => s.status === 'باطل‌شده').length,
    paid: filtered.filter((s) => s.status === 'پرداخت شده').length,
  };

  const handleCreate = async (e) => {
    e?.preventDefault?.();
    setLoading(true);
    try {
      await api.post('/permission-serials', form);
      setShowForm(false);
      setForm({ serial_number: '', recipient_user_id: '', quantity: 1 });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const { setRef, handleKeyDown, focusFirst } = useFormKeyboardNav({
    fieldCount: 3,
    onSubmitLast: handleCreate,
  });

  useEffect(() => {
    if (showForm) setTimeout(focusFirst, 50);
  }, [showForm, focusFirst]);

  useEffect(() => {
    if (!showForm) return;

    const prefillSerial = async () => {
      try {
        // Get the latest record regardless of current filters/search.
        const res = await api.get('/permission-serials');
        const lastSerial = res.data?.data?.[0]?.serial_number;
        const nextSerial = getNextSerialNumber(lastSerial);
        setForm({
          serial_number: nextSerial,
          recipient_user_id: '',
          quantity: 1,
        });
      } catch {
        // If prefill fails, keep current defaults and let admin type manually.
        setForm({ serial_number: '', recipient_user_id: '', quantity: 1 });
      }
    };

    prefillSerial();
  }, [showForm]);

  const handleVoid = async (id) => {
    if (!window.confirm('آیا از باطل‌کردن این مجوز اطمینان دارید؟')) return;
    try {
      await api.patch(`/permission-serials/${id}/void`);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  const handleAwaiting = async (id) => {
    try {
      await api.patch(`/permission-serials/${id}/awaiting`);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  const exportToExcel = () => {
    if (filtered.length === 0) {
      alert('دیتایی برای خروجی گرفتن وجود ندارد.');
      return;
    }

    const excelData = filtered.map((item) => ({
      'شناسه': item.id,
      'شماره سریال': item.serial_number,
      'تحویل‌گیرنده': item.recipient_name || '',
      'وضعیت': item.status,
      'محل مصرف': item.usage_location || '',
    }));

    const exportStamp = formatExportDate().replace(/[/:]/g, '-').replace(/\s+/g, '_');
    downloadFormattedExcel(
      'مجوزهای پرداخت',
      excelData,
      `PermissionSerials_${exportStamp}.xlsx`,
      { title: 'گزارش مجوزهای پرداخت' },
    );
  };

  const columns = [
    { key: 'id', header: 'شناسه' },
    { key: 'serial_number', header: 'شماره سریال', render: (s) => <span className="font-mono font-bold">{s.serial_number}</span> },
    { key: 'recipient_name', header: 'تحویل‌گیرنده', render: (s) => s.recipient_name || '—' },
    {
      key: 'status',
      header: 'وضعیت',
      render: (s) => <span className={statusBadgeClass(s.status)}>{s.status}</span>,
    },
    { key: 'usage_location', header: 'محل مصرف', render: (s) => s.usage_location || '—' },
  ];

  if (isAdmin()) {
    columns.push({
      key: 'actions',
      header: 'عملیات',
      render: (s) => (
        <div className="flex gap-2">
          {s.status === 'فرم خام' && (
            <Button variant="secondary" onClick={() => handleAwaiting(s.id)}>در انتظار پرداخت</Button>
          )}
          {(s.status === 'فرم خام' || s.status === 'در انتظار پرداخت') && (
            <Button variant="danger" onClick={() => handleVoid(s.id)}>باطل</Button>
          )}
        </div>
      ),
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="سریال مجوز پرداخت"
        description="Enter بین فیلدها · جستجو با Ctrl+K"
        actions={isAdmin() && (
          <>
            <Button onClick={() => setShowForm(true)}>مجوز جدید</Button>
            <Button variant="secondary" onClick={exportToExcel}>خروجی اکسل</Button>
          </>
        )}
      >
        <div className="flex flex-wrap gap-3">
          <select className="ui-select" style={{ width: 'auto', minWidth: '10rem' }} value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">همه وضعیت‌ها</option>
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="ui-select" style={{ width: 'auto', minWidth: '10rem' }} value={usageFilter}
            onChange={(e) => setUsageFilter(e.target.value)}>
            <option value="">همه محل مصرف</option>
            <option value="تجاری">تجاری</option>
            <option value="پرسنل">پرسنل</option>
            <option value="ماشین‌آلات">ماشین‌آلات</option>
          </select>
          <select
            className="ui-select"
            style={{ width: 'auto', minWidth: '12rem' }}
            value={recipientFilter}
            onChange={(e) => setRecipientFilter(e.target.value)}
          >
            <option value="">همه تحویل‌گیرنده‌ها</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.role})
              </option>
            ))}
          </select>
          <SearchInput
            inputRef={searchRef}
            className="flex-1 min-w-[12rem]"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="جستجو..."
          />
        </div>
      </PageHeader>

      {isAdmin() && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <Card className="p-4 space-y-1">
            <div className="text-xs ui-muted">کل</div>
            <div className="text-2xl font-black">{dashboardCounts.total}</div>
          </Card>
          <Card className="p-4 space-y-1">
            <div className="text-xs ui-muted">فرم خام</div>
            <div className="text-2xl font-black">{dashboardCounts.raw}</div>
          </Card>
          <Card className="p-4 space-y-1">
            <div className="text-xs ui-muted">در انتظار پرداخت</div>
            <div className="text-2xl font-black">{dashboardCounts.awaiting}</div>
          </Card>
          <Card className="p-4 space-y-1">
            <div className="text-xs ui-muted">باطل‌شده</div>
            <div className="text-2xl font-black">{dashboardCounts.voided}</div>
          </Card>
          <Card className="p-4 space-y-1">
            <div className="text-xs ui-muted">پرداخت‌شده</div>
            <div className="text-2xl font-black">{dashboardCounts.paid}</div>
          </Card>
        </div>
      )}

      {showForm && isAdmin() && (
        <Card className="p-5 md:p-6">
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextInput
              label="شماره سریال *"
              required
              inputRef={setRef(0)}
              onKeyDown={(e) => handleKeyDown(e, 0)}
              value={form.serial_number}
              onChange={(e) => setForm({ ...form, serial_number: e.target.value })}
            />
            <TextInput
              label="تعداد *"
              required
              type="number"
              min={1}
              step={1}
              inputRef={setRef(1)}
              onKeyDown={(e) => handleKeyDown(e, 1)}
              value={form.quantity}
              onChange={(e) => {
                const next = parseInt(e.target.value || '1', 10);
                setForm({ ...form, quantity: Number.isFinite(next) ? Math.max(1, next) : 1 });
              }}
              max={2000}
            />
            <SelectField
              label="تحویل‌گیرنده *"
              required
              className="md:col-span-2"
              inputRef={setRef(2)}
              onKeyDown={(e) => handleKeyDown(e, 2)}
              value={form.recipient_user_id}
              onChange={(e) => setForm({ ...form, recipient_user_id: e.target.value })}
            >
              <option value="">انتخاب کاربر</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
            </SelectField>

            {(() => {
              const qty = Number(form.quantity || 1);
              const start = String(form.serial_number || '').trim();
              if (!start || qty <= 1) return null;
              const match = start.match(/^(.*?)(\d+)$/);
              if (!match) {
                return (
                  <div className="md:col-span-2">
                    <p className="text-xs ui-muted mt-1">
                      برای ساخت چند مجوز پشت‌سرهم، شماره سریال باید به عدد ختم شود (مثل <span className="font-mono">1000</span> یا <span className="font-mono">SER-1000</span>).
                    </p>
                  </div>
                );
              }

              const prefix = match[1];
              const digits = match[2];
              const width = digits.length;
              try {
                const startNum = BigInt(digits);
                const lastNum = startNum + BigInt(qty - 1);
                const last = `${prefix}${lastNum.toString().padStart(width, '0')}`;
                return (
                  <div className="md:col-span-2">
                    <p className="text-xs ui-muted mt-1">
                      از <span className="font-mono">{start}</span> تا <span className="font-mono">{last}</span> (تعداد: {qty})
                    </p>
                  </div>
                );
              } catch {
                return null;
              }
            })()}
            <div className="md:col-span-2 flex gap-3">
              <Button type="submit" disabled={loading}>ذخیره</Button>
              <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>انصراف</Button>
            </div>
          </form>
        </Card>
      )}

      <DataTable columns={columns} rows={filtered} emptyText="مجوزی یافت نشد" />
    </div>
  );
}

export default PermissionSerialsPage;
