import React, { useState, useEffect, useRef } from 'react';
import api, { isAdmin } from '../api';
import {
  Button, Card, DataTable, PageHeader, SearchInput, TextInput,
} from '../components/ui';
import { useFormKeyboardNav } from '../hooks/useFormKeyboardNav';

const FIELDS = [
  { name: 'first_name', label: 'نام', required: false },
  { name: 'last_name', label: 'نام خانوادگی', required: false },
  { name: 'business_name', label: 'نام تجاری', required: true },
  { name: 'sheba', label: 'شماره شبا', required: true },
  { name: 'account_holder_name', label: 'نام صاحب حساب', required: true },
  { name: 'account_code', label: 'کد طرف حساب', required: true },
  { name: 'mobile', label: 'موبایل', required: false },
  { name: 'phone', label: 'تلفن', required: false },
  { name: 'city', label: 'شهر', required: false },
  { name: 'service_category', label: 'دسته‌بندی خدمات', required: true },
  { name: 'description', label: 'توضیحات', required: false, fullWidth: true },
];

const emptyForm = () => Object.fromEntries(FIELDS.map((f) => [f.name, '']));

function BusinessContactsPage() {
  const [contacts, setContacts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState(emptyForm());
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const searchRef = useRef(null);

  const fetchContacts = async () => {
    try {
      const res = await api.get('/business-contacts');
      setContacts(res.data.data || []);
    } catch (err) {
      console.error(err);
    }
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

  const filtered = contacts.filter((c) => {
    const text = [c.business_name, c.account_code, c.first_name, c.last_name, c.sheba, c.service_category]
      .join(' ').toLowerCase();
    return text.includes(searchTerm.toLowerCase());
  });

  const openCreate = () => {
    setEditingId(null);
    setFormData(emptyForm());
    setShowForm(true);
  };

  const openEdit = (contact) => {
    setEditingId(contact.id);
    setFormData(Object.fromEntries(FIELDS.map((f) => [f.name, contact[f.name] || ''])));
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData(emptyForm());
  };

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    setLoading(true);
    try {
      if (editingId) {
        const res = await api.put(`/business-contacts/${editingId}`, formData);
        alert(res.data.message);
      } else {
        const res = await api.post('/business-contacts', formData);
        alert(res.data.message);
      }
      closeForm();
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

  const handleDelete = async (id) => {
    if (!window.confirm('آیا از حذف این مخاطب اطمینان دارید؟')) return;
    try {
      const res = await api.delete(`/business-contacts/${id}`);
      alert(res.data.message);
      fetchContacts();
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  const columns = [
    { key: 'business_name', header: 'نام تجاری', render: (c) => <span className="font-medium">{c.business_name}</span> },
    { key: 'account_code', header: 'کد طرف حساب' },
    { key: 'account_holder_name', header: 'صاحب حساب' },
    { key: 'sheba', header: 'شبا', render: (c) => <span className="font-mono text-xs">{c.sheba}</span> },
    { key: 'service_category', header: 'دسته‌بندی' },
    { key: 'city', header: 'شهر', render: (c) => c.city || '—' },
    { key: 'mobile', header: 'موبایل', render: (c) => c.mobile || '—' },
  ];

  if (isAdmin()) {
    columns.push({
      key: 'actions',
      header: 'عملیات',
      render: (c) => (
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => openEdit(c)}>ویرایش</Button>
          <Button variant="danger" onClick={() => handleDelete(c.id)}>حذف</Button>
        </div>
      ),
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="مخاطبین تجاری"
        description="Enter بین فیلدها · جستجو با Ctrl+K"
        actions={isAdmin() && <Button onClick={openCreate}>مخاطب جدید</Button>}
      >
        <SearchInput
          inputRef={searchRef}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="جستجو در نام تجاری، کد طرف حساب، شبا..."
        />
      </PageHeader>

      {showForm && isAdmin() && (
        <Card className="p-5 md:p-6 space-y-4">
          <h3 className="text-lg font-bold">{editingId ? 'ویرایش مخاطب' : 'ثبت مخاطب جدید'}</h3>
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
            <div className="md:col-span-3 flex gap-3 mt-2">
              <Button type="submit" disabled={loading}>{loading ? 'در حال ذخیره...' : 'ذخیره'}</Button>
              <Button type="button" variant="secondary" onClick={closeForm}>انصراف</Button>
            </div>
          </form>
        </Card>
      )}

      <DataTable columns={columns} rows={filtered} emptyText="مخاطبی یافت نشد" />
      <p className="text-xs ui-muted px-1">{filtered.length} مخاطب</p>
    </div>
  );
}

export default BusinessContactsPage;
