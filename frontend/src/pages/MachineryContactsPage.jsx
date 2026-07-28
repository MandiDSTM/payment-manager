import React, { useState, useEffect, useRef } from 'react';
import api, { isAdmin } from '../api';
import {
  Button, Card, DataTable, PageHeader, SearchInput, SelectField, TextInput,
} from '../components/ui';
import { useFormKeyboardNav } from '../hooks/useFormKeyboardNav';

const FIELDS = [
  { name: 'account_code', label: 'کد طرف حساب', required: true },
  { name: 'first_name', label: 'نام', required: true },
  { name: 'last_name', label: 'نام خانوادگی', required: true },
  { name: 'machine_id', label: 'ماشین', required: true, type: 'select' },
  { name: 'plate', label: 'پلاک', required: false },
  { name: 'sheba', label: 'شماره شبا', required: true },
  { name: 'account_holder_name', label: 'نام صاحب حساب', required: true },
  { name: 'mobile', label: 'موبایل', required: false },
  { name: 'city', label: 'شهر', required: false },
  { name: 'description', label: 'توضیحات', required: false, fullWidth: true },
];

const emptyForm = () => Object.fromEntries(FIELDS.map((f) => [f.name, '']));

function MachineryContactsPage() {
  const [contacts, setContacts] = useState([]);
  const [machines, setMachines] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState(emptyForm());
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const searchRef = useRef(null);

  const fetchData = async () => {
    try {
      const [contactsRes, machinesRes] = await Promise.all([
        api.get('/machinery-contacts'),
        api.get('/machines'),
      ]);
      setContacts(contactsRes.data.data || []);
      setMachines(machinesRes.data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { fetchData(); }, []);

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
    const text = [c.account_code, c.first_name, c.last_name, c.machine_name, c.plate, c.sheba]
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
    setFormData({
      ...Object.fromEntries(FIELDS.map((f) => [f.name, contact[f.name] || ''])),
      machine_id: String(contact.machine_id || ''),
    });
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
    const payload = { ...formData, machine_id: Number(formData.machine_id) };
    try {
      if (editingId) {
        const res = await api.put(`/machinery-contacts/${editingId}`, payload);
        alert(res.data.message);
      } else {
        const res = await api.post('/machinery-contacts', payload);
        alert(res.data.message);
      }
      closeForm();
      fetchData();
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
      const res = await api.delete(`/machinery-contacts/${id}`);
      alert(res.data.message);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const form = new FormData();
    form.append('file', file);
    setUploading(true);
    try {
      const res = await api.post('/machinery-contacts/upload-excel', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      let msg = res.data.message;
      if (res.data.errors?.length > 0) {
        msg += `\n\nخطاها:\n${res.data.errors.map((e) => `ردیف ${e.row}: ${e.message}`).join('\n')}`;
      }
      alert(msg);
      fetchData();
    } catch (err) {
      const data = err.response?.data;
      let msg = data?.message || err.message;
      if (data?.errors?.length > 0) {
        msg += `\n\n${data.errors.map((e) => `ردیف ${e.row}: ${e.message}`).join('\n')}`;
      }
      alert(msg);
    } finally {
      setUploading(false);
      event.target.value = null;
    }
  };

  const columns = [
    { key: 'account_code', header: 'کد طرف حساب' },
    { key: 'first_name', header: 'نام' },
    { key: 'last_name', header: 'نام خانوادگی' },
    { key: 'machine_name', header: 'ماشین', render: (c) => c.machine_name || '—' },
    { key: 'plate', header: 'پلاک', render: (c) => c.plate || '—' },
    { key: 'sheba', header: 'شبا', render: (c) => <span className="font-mono text-xs">{c.sheba}</span> },
    { key: 'account_holder_name', header: 'صاحب حساب' },
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
        title="مخاطبین ماشین‌آلات"
        description="Enter بین فیلدها · جستجو با Ctrl+K"
        actions={isAdmin() && (
          <>
            <Button onClick={openCreate}>مخاطب جدید</Button>
            <label className={`ui-btn ui-btn-primary cursor-pointer ${uploading ? 'opacity-50' : ''}`}>
              {uploading ? 'در حال پردازش...' : 'آپلود اکسل'}
              <input type="file" className="hidden" accept=".xlsx,.xls" onChange={handleFileUpload} disabled={uploading} />
            </label>
          </>
        )}
      >
        <SearchInput
          inputRef={searchRef}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="جستجو در نام، کد طرف حساب، پلاک، شبا..."
        />
        {isAdmin() && (
          <p className="text-xs ui-muted mt-2">
            ستون‌های اکسل: کد طرف حساب، نام، نام خانوادگی، نام ماشین، پلاک، شبا، نام صاحب حساب، موبایل، شهر، توضیحات
          </p>
        )}
      </PageHeader>

      {showForm && isAdmin() && (
        <Card className="p-5 md:p-6 space-y-4">
          <h3 className="text-lg font-bold">{editingId ? 'ویرایش مخاطب' : 'ثبت مخاطب جدید'}</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {FIELDS.map((field, index) => (
              field.type === 'select' ? (
                <SelectField
                  key={field.name}
                  label={`${field.label}${field.required ? ' *' : ''}`}
                  className={field.fullWidth ? 'md:col-span-3' : ''}
                  required={field.required}
                  inputRef={setRef(index)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  value={formData[field.name]}
                  onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                >
                  <option value="">انتخاب ماشین...</option>
                  {machines.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </SelectField>
              ) : (
                <TextInput
                  key={field.name}
                  label={`${field.label}${field.required ? ' *' : ''}`}
                  className={field.fullWidth ? 'md:col-span-3' : ''}
                  inputRef={setRef(index)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  value={formData[field.name]}
                  onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                />
              )
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

export default MachineryContactsPage;
