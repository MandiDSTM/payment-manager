import React, { useEffect, useState } from 'react';
import api, { isAdmin } from '../api';
import {
  Button, Card, DataTable, PageHeader, StatusTabs, TextInput,
} from '../components/ui';
import { executorLabel } from '../utils/lookups';

const TABS = [
  { value: 'projects', label: 'پروژه' },
  { value: 'executors', label: 'مجری' },
  { value: 'salary', label: 'نوع پرداخت حقوق' },
  { value: 'commercial', label: 'نوع پرداخت تجاری' },
  { value: 'machinery', label: 'نوع پرداخت ماشین‌آلات' },
];

const CATEGORY_CONFIG = {
  salary: { path: '/salary-payment-categories', title: 'نوع پرداخت حقوق', hint: 'مثل مساعده، کارکرد ماهانه، درمان' },
  commercial: { path: '/commercial-payment-categories', title: 'نوع پرداخت تجاری', hint: 'مثل خرید کالا، کرایه حمل' },
  machinery: { path: '/machinery-payment-categories', title: 'نوع پرداخت ماشین‌آلات', hint: 'مثل علی‌الحساب، کارکرد ماهانه' },
};

function NameLookupPanel({ path, title, hint, nameLabel = 'نام' }) {
  const [rows, setRows] = useState([]);
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchRows = async () => {
    const res = await api.get(path);
    setRows(res.data.data || []);
  };

  useEffect(() => { fetchRows().catch((err) => alert(err.response?.data?.message || err.message)); }, [path]);

  const reset = () => {
    setName('');
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    if (!name.trim()) return alert(`${nameLabel} اجباری است`);
    setLoading(true);
    try {
      if (editingId) await api.put(`${path}/${editingId}`, { name: name.trim() });
      else await api.post(path, { name: name.trim() });
      reset();
      await fetchRows();
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { key: 'index', header: '#', render: (_r, i) => i + 1 },
    { key: 'name', header: nameLabel },
  ];
  if (isAdmin()) {
    columns.push({
      key: 'actions',
      header: 'عملیات',
      render: (row) => (
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => { setEditingId(row.id); setName(row.name); }}>ویرایش</Button>
          <Button variant="danger" onClick={async () => {
            if (!window.confirm('حذف شود؟')) return;
            try {
              await api.delete(`${path}/${row.id}`);
              fetchRows();
            } catch (err) { alert(err.response?.data?.message || err.message); }
          }}>حذف</Button>
        </div>
      ),
    });
  }

  return (
    <div className="space-y-4">
      {isAdmin() && (
        <Card className="p-5">
          <h3 className="font-bold mb-1">{editingId ? `ویرایش ${title}` : `ثبت ${title}`}</h3>
          {hint && <p className="text-xs ui-muted mb-3">{hint}</p>}
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 items-end">
            <TextInput label={`${nameLabel} *`} className="flex-1 w-full" value={name} onChange={(e) => setName(e.target.value)} />
            <Button type="submit" disabled={loading}>{loading ? '...' : editingId ? 'بروزرسانی' : 'ثبت'}</Button>
            {editingId && <Button type="button" variant="secondary" onClick={reset}>انصراف</Button>}
          </form>
        </Card>
      )}
      <DataTable columns={columns} rows={rows} emptyText="موردی ثبت نشده است" />
    </div>
  );
}

function ExecutorsPanel() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({ first_name: '', last_name: '' });
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchRows = async () => {
    const res = await api.get('/executors');
    setRows(res.data.data || []);
  };

  useEffect(() => { fetchRows().catch((err) => alert(err.response?.data?.message || err.message)); }, []);

  const reset = () => {
    setForm({ first_name: '', last_name: '' });
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    if (!form.first_name.trim() || !form.last_name.trim()) return alert('نام و نام خانوادگی اجباری است');
    setLoading(true);
    try {
      const body = { first_name: form.first_name.trim(), last_name: form.last_name.trim() };
      if (editingId) await api.put(`/executors/${editingId}`, body);
      else await api.post('/executors', body);
      reset();
      await fetchRows();
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { key: 'index', header: '#', render: (_r, i) => i + 1 },
    { key: 'first_name', header: 'نام' },
    { key: 'last_name', header: 'نام خانوادگی' },
    { key: 'full', header: 'نام کامل', render: executorLabel },
  ];
  if (isAdmin()) {
    columns.push({
      key: 'actions',
      header: 'عملیات',
      render: (row) => (
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => {
            setEditingId(row.id);
            setForm({ first_name: row.first_name || '', last_name: row.last_name || '' });
          }}>ویرایش</Button>
          <Button variant="danger" onClick={async () => {
            if (!window.confirm('حذف شود؟')) return;
            try {
              await api.delete(`/executors/${row.id}`);
              fetchRows();
            } catch (err) { alert(err.response?.data?.message || err.message); }
          }}>حذف</Button>
        </div>
      ),
    });
  }

  return (
    <div className="space-y-4">
      {isAdmin() && (
        <Card className="p-5">
          <h3 className="font-bold mb-3">{editingId ? 'ویرایش مجری' : 'ثبت مجری'}</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <TextInput label="نام *" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
            <TextInput label="نام خانوادگی *" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
            <div className="flex gap-2">
              <Button type="submit" disabled={loading}>{loading ? '...' : editingId ? 'بروزرسانی' : 'ثبت'}</Button>
              {editingId && <Button type="button" variant="secondary" onClick={reset}>انصراف</Button>}
            </div>
          </form>
        </Card>
      )}
      <DataTable columns={columns} rows={rows} emptyText="مجری ثبت نشده است" />
    </div>
  );
}

function LookupsPage() {
  const [tab, setTab] = useState('projects');
  const category = CATEGORY_CONFIG[tab];

  return (
    <div className="space-y-6">
      <PageHeader
        title="داده‌های مرجع پرداخت"
        description="پروژه، مجری و نوع پرداخت از اینجا مدیریت می‌شوند و در فرم‌های تجاری، ماشین‌آلات و حقوق به‌صورت دراپ‌داون می‌آیند"
      >
        <StatusTabs tabs={TABS} value={tab} onChange={setTab} />
      </PageHeader>

      {tab === 'projects' && (
        <NameLookupPanel path="/projects" title="پروژه" nameLabel="نام پروژه" hint="نمونه: دیزج ۲، جلفا، دفتر، عمومی" />
      )}
      {tab === 'executors' && <ExecutorsPanel />}
      {category && (
        <NameLookupPanel path={category.path} title={category.title} nameLabel="نوع پرداخت" hint={category.hint} />
      )}
    </div>
  );
}

export default LookupsPage;
