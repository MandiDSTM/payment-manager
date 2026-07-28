import React, { useState, useEffect, useRef } from 'react';
import api, { isAdmin } from '../api';
import {
  Button, Card, DataTable, PageHeader, SearchInput, TextInput,
} from '../components/ui';
import { useFormKeyboardNav } from '../hooks/useFormKeyboardNav';

const FIELDS = [
  { name: 'personnel_code', label: 'شماره پرسنلی', required: true },
  { name: 'first_name', label: 'نام', required: true },
  { name: 'last_name', label: 'نام خانوادگی', required: true },
  { name: 'sheba', label: 'شماره شبا', required: true },
  { name: 'account_holder_name', label: 'نام صاحب حساب', required: true },
  { name: 'mobile', label: 'موبایل', required: false },
  { name: 'city', label: 'شهر', required: false },
  { name: 'description', label: 'توضیحات', required: false, fullWidth: true },
];

const emptyForm = () => Object.fromEntries(FIELDS.map((f) => [f.name, '']));

function PersonnelContactsPage() {
  const [contacts, setContacts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState(emptyForm());
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const searchRef = useRef(null);

  const fetchContacts = async () => {
    const res = await api.get('/personnel-contacts');
    setContacts(res.data.data || []);
  };

  useEffect(() => { fetchContacts(); }, []);

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

  const filtered = contacts.filter((c) =>
    [c.personnel_code, c.first_name, c.last_name, c.sheba].join(' ').toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    setLoading(true);
    try {
      if (editingId) await api.put(`/personnel-contacts/${editingId}`, formData);
      else await api.post('/personnel-contacts', formData);
      setShowForm(false);
      setEditingId(null);
      setFormData(emptyForm());
      fetchContacts();
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const { setRef, handleKeyDown, focusFirst } = useFormKeyboardNav({
    fieldCount: FIELDS.length,
    onSubmitLast: handleSubmit,
  });

  useEffect(() => {
    if (showForm) setTimeout(focusFirst, 50);
  }, [showForm, focusFirst]);

  const columns = [
    { key: 'personnel_code', header: 'پرسنلی' },
    { key: 'name', header: 'نام', render: (c) => `${c.first_name} ${c.last_name}` },
    { key: 'sheba', header: 'شبا', render: (c) => <span className="font-mono text-xs">{c.sheba}</span> },
    { key: 'account_holder_name', header: 'صاحب حساب' },
  ];

  if (isAdmin()) {
    columns.push({
      key: 'actions',
      header: 'عملیات',
      render: (c) => (
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => {
            setEditingId(c.id);
            setFormData(Object.fromEntries(FIELDS.map((f) => [f.name, c[f.name] || ''])));
            setShowForm(true);
          }}>ویرایش</Button>
          <Button variant="danger" onClick={async () => {
            if (!window.confirm('حذف؟')) return;
            try {
              await api.delete(`/personnel-contacts/${c.id}`);
              fetchContacts();
            } catch (err) { alert(err.response?.data?.message || err.message); }
          }}>حذف</Button>
        </div>
      ),
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="مخاطبین پرسنل"
        description="Enter بین فیلدها · جستجو با Ctrl+K"
        actions={isAdmin() && (
          <Button onClick={() => { setEditingId(null); setFormData(emptyForm()); setShowForm(true); }}>
            پرسنل جدید
          </Button>
        )}
      >
        <SearchInput
          inputRef={searchRef}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="جستجو..."
        />
      </PageHeader>

      {showForm && isAdmin() && (
        <Card className="p-5 md:p-6">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {FIELDS.map((field, index) => (
              <TextInput
                key={field.name}
                label={`${field.label}${field.required ? ' *' : ''}`}
                className={field.fullWidth ? 'md:col-span-3' : ''}
                inputRef={setRef(index)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                value={formData[field.name]}
                onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
              />
            ))}
            <div className="md:col-span-3 flex gap-3">
              <Button type="submit" disabled={loading}>ذخیره</Button>
              <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>انصراف</Button>
            </div>
          </form>
        </Card>
      )}

      <DataTable columns={columns} rows={filtered} emptyText="مخاطبی یافت نشد" />
    </div>
  );
}

export default PersonnelContactsPage;
