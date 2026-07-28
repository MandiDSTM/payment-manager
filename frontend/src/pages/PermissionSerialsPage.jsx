import React, { useState, useEffect, useRef } from 'react';
import api, { isAdmin } from '../api';
import {
  Button, Card, DataTable, PageHeader, SearchInput, SelectField, TextInput,
} from '../components/ui';
import { useFormKeyboardNav } from '../hooks/useFormKeyboardNav';
import { statusBadgeClass } from '../utils/format';

const STATUS_OPTIONS = ['فرم خام', 'در انتظار پرداخت', 'باطل‌شده', 'پرداخت شده'];

function PermissionSerialsPage() {
  const [serials, setSerials] = useState([]);
  const [users, setUsers] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [usageFilter, setUsageFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [form, setForm] = useState({ serial_number: '', recipient_user_id: '' });
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const searchRef = useRef(null);

  const fetchData = async () => {
    const params = {};
    if (statusFilter) params.status = statusFilter;
    if (usageFilter) params.usage_location = usageFilter;
    const [s, u] = await Promise.all([
      api.get('/permission-serials', { params }),
      api.get('/users'),
    ]);
    setSerials(s.data.data || []);
    setUsers(u.data.data || []);
  };

  useEffect(() => { fetchData(); }, [statusFilter, usageFilter]);

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

  const handleCreate = async (e) => {
    e?.preventDefault?.();
    setLoading(true);
    try {
      await api.post('/permission-serials', form);
      setShowForm(false);
      setForm({ serial_number: '', recipient_user_id: '' });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const { setRef, handleKeyDown, focusFirst } = useFormKeyboardNav({
    fieldCount: 2,
    onSubmitLast: handleCreate,
  });

  useEffect(() => {
    if (showForm) setTimeout(focusFirst, 50);
  }, [showForm, focusFirst]);

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
        actions={isAdmin() && <Button onClick={() => setShowForm(true)}>مجوز جدید</Button>}
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
          <SearchInput
            inputRef={searchRef}
            className="flex-1 min-w-[12rem]"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="جستجو..."
          />
        </div>
      </PageHeader>

      {showForm && isAdmin() && (
        <Card className="p-5 md:p-6">
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextInput label="شماره سریال *" required inputRef={setRef(0)} onKeyDown={(e) => handleKeyDown(e, 0)}
              value={form.serial_number} onChange={(e) => setForm({ ...form, serial_number: e.target.value })} />
            <SelectField label="تحویل‌گیرنده *" required inputRef={setRef(1)} onKeyDown={(e) => handleKeyDown(e, 1)}
              value={form.recipient_user_id} onChange={(e) => setForm({ ...form, recipient_user_id: e.target.value })}>
              <option value="">انتخاب کاربر</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
            </SelectField>
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
