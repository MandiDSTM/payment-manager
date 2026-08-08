import React, { useState, useEffect, useRef } from 'react';
import api, { isAdmin } from '../api';
import {
  Button, Card, DataTable, PageHeader, SearchInput, TextInput,
} from '../components/ui';
import PersonnelExcelImport from '../components/PersonnelExcelImport';
import { useFormKeyboardNav } from '../hooks/useFormKeyboardNav';

const FIELDS = [
  { name: 'personnel_code', label: 'شماره پرسنلی (خالی = خودکار)', required: false },
  { name: 'national_id', label: 'کد ملی', required: true },
  { name: 'first_name', label: 'نام', required: true },
  { name: 'last_name', label: 'نام خانوادگی', required: true },
  { name: 'sheba', label: 'شماره شبا', required: false },
  { name: 'account_holder_name', label: 'نام صاحب حساب', required: true },
  { name: 'mobile', label: 'موبایل', required: false },
  { name: 'city', label: 'شهر', required: false },
  { name: 'description', label: 'توضیحات', required: false, fullWidth: true },
];

const emptyForm = () => Object.fromEntries(FIELDS.map((f) => [f.name, '']));

const downloadBlob = (data, filename) => {
  const url = window.URL.createObjectURL(new Blob([data]));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  window.URL.revokeObjectURL(url);
};

function PersonnelContactsPage() {
  const [contacts, setContacts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState(emptyForm());
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
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
    [c.personnel_code, c.national_id, c.first_name, c.last_name, c.sheba].join(' ').toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await api.get('/excel/export/personnel', { responseType: 'blob' });
      downloadBlob(res.data, `personnel-${Date.now()}.xlsx`);
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'خطا در خروجی اکسل');
    } finally {
      setExporting(false);
    }
  };

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
    { key: 'national_id', header: 'کد ملی', render: (c) => c.national_id || '—' },
    { key: 'name', header: 'نام', render: (c) => `${c.first_name} ${c.last_name}` },
    {
      key: 'sheba',
      header: 'شبا',
      render: (c) => (
        <div>
          <span className="font-mono text-xs">{c.sheba || '—'}</span>
          {c.sheba_needs_review ? (
            <div className="text-xs mt-1" style={{ color: '#b45309' }}>نیاز به اصلاح شبا</div>
          ) : null}
        </div>
      ),
    },
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
        description="Enter بین فیلدها · جستجو با Ctrl+K · ورود گروهی با اکسل"
        actions={(
          <div className="flex flex-wrap gap-2 items-center">
            <Button variant="secondary" onClick={handleExport} disabled={exporting}>
              {exporting ? 'در حال آماده‌سازی...' : 'خروجی پرسنل'}
            </Button>
            {isAdmin() && (
              <>
                <Button onClick={() => { setEditingId(null); setFormData(emptyForm()); setShowForm(true); }}>
                  پرسنل جدید
                </Button>
                <PersonnelExcelImport variant="toolbar" onDone={fetchContacts} />
              </>
            )}
          </div>
        )}
      >
        <SearchInput
          inputRef={searchRef}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="جستجو..."
        />
        {isAdmin() && (
          <p className="text-xs ui-muted mt-2">
            ستون‌های اکسل: کد پرسنلی، کد ملی، نام و نام خانوادگی پرسنل، شبا، نام صاحب حساب، شماره تماس، محل تولد
          </p>
        )}
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
