import React, { useState, useEffect, useRef } from 'react';
import api, { isAdmin } from '../api';
import {
  Button, Card, DataTable, PageHeader, SearchInput, TextInput,
} from '../components/ui';
import PersonnelExcelImport from '../components/PersonnelExcelImport';
import PersonnelDuplicatesModal from '../components/PersonnelDuplicatesModal';
import PersonnelStatCards from '../components/PersonnelStatCards';
import { useFormKeyboardNav } from '../hooks/useFormKeyboardNav';

const isValidNationalId = (value) => /^\d{10}$/.test(String(value || '').trim());
const isAutoPersonnelCode = (value) => /^AUTO-/i.test(String(value || '').trim());
const isInvalidSheba = (contact) => contact.sheba_needs_review === true || Number(contact.sheba_needs_review) === 1;
const isMissingNationalId = (contact) => !String(contact.national_id || '').trim();
const isInvalidNationalId = (contact) => {
  const value = String(contact.national_id || '').trim();
  return Boolean(value) && !isValidNationalId(value);
};

const FILTERS = {
  all: 'all',
  duplicates: 'duplicates',
  missing_nid: 'missing_nid',
  invalid_nid: 'invalid_nid',
  invalid_sheba: 'invalid_sheba',
  auto_code: 'auto_code',
};

const FIELDS = [
  { name: 'personnel_code', label: 'شماره پرسنلی (خالی = خودکار)', required: false },
  { name: 'national_id', label: 'کد ملی', required: false },
  { name: 'first_name', label: 'نام', required: true },
  { name: 'last_name', label: 'نام خانوادگی', required: true },
  { name: 'father_name', label: 'نام پدر', required: false },
  { name: 'sheba', label: 'شماره شبا', required: true },
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
  const [selectedIds, setSelectedIds] = useState([]);
  const [deleting, setDeleting] = useState(false);
  const [dupOpen, setDupOpen] = useState(false);
  const [dupGroups, setDupGroups] = useState([]);
  const [dupLoading, setDupLoading] = useState(false);
  const [merging, setMerging] = useState(false);
  const [dashFilter, setDashFilter] = useState(FILTERS.all);
  const [dupMemberIds, setDupMemberIds] = useState(() => new Set());
  const [dupGroupCount, setDupGroupCount] = useState(0);
  const searchRef = useRef(null);

  const refreshDuplicates = async () => {
    if (!isAdmin()) {
      setDupGroups([]);
      setDupMemberIds(new Set());
      setDupGroupCount(0);
      return;
    }
    try {
      const res = await api.get('/personnel-contacts/duplicates');
      const groups = res.data.data || [];
      const ids = new Set();
      groups.forEach((group) => (group.members || []).forEach((member) => ids.add(member.id)));
      setDupGroups(groups);
      setDupMemberIds(ids);
      setDupGroupCount(groups.length);
    } catch {
      setDupGroups([]);
      setDupMemberIds(new Set());
      setDupGroupCount(0);
    }
  };

  const fetchContacts = async () => {
    const res = await api.get('/personnel-contacts');
    setContacts(res.data.data || []);
    await refreshDuplicates();
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

  const matchesDashFilter = (contact) => {
    if (dashFilter === FILTERS.duplicates) return dupMemberIds.has(contact.id);
    if (dashFilter === FILTERS.missing_nid) return isMissingNationalId(contact);
    if (dashFilter === FILTERS.invalid_nid) return isInvalidNationalId(contact);
    if (dashFilter === FILTERS.invalid_sheba) return isInvalidSheba(contact);
    if (dashFilter === FILTERS.auto_code) return isAutoPersonnelCode(contact.personnel_code);
    return true;
  };

  const dashFiltered = contacts.filter(matchesDashFilter);
  const filtered = dashFiltered.filter((c) =>
    [c.personnel_code, c.national_id, c.first_name, c.last_name, c.father_name, c.sheba].join(' ').toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const statCards = [
    { key: FILTERS.all, label: 'همه پرسنل', count: contacts.length, hint: 'کل فهرست' },
    {
      key: FILTERS.duplicates,
      label: 'موارد مشابه',
      count: dupMemberIds.size,
      hint: dupGroupCount ? `${dupGroupCount} گروه` : 'نام یا شبا تکراری',
    },
    { key: FILTERS.missing_nid, label: 'بدون کد ملی', count: contacts.filter(isMissingNationalId).length, hint: 'کد ملی خالی' },
    { key: FILTERS.invalid_nid, label: 'کد ملی نامعتبر', count: contacts.filter(isInvalidNationalId).length, hint: 'باید ۱۰ رقم باشد' },
    { key: FILTERS.invalid_sheba, label: 'شبا نامعتبر', count: contacts.filter(isInvalidSheba).length, hint: 'نیاز به اصلاح' },
    { key: FILTERS.auto_code, label: 'کد پرسنلی خودکار', count: contacts.filter((c) => isAutoPersonnelCode(c.personnel_code)).length, hint: 'شروع با AUTO-' },
  ];

  const filterLabels = {
    [FILTERS.all]: 'همه',
    [FILTERS.duplicates]: 'موارد مشابه',
    [FILTERS.missing_nid]: 'بدون کد ملی',
    [FILTERS.invalid_nid]: 'کد ملی نامعتبر',
    [FILTERS.invalid_sheba]: 'شبا نامعتبر',
    [FILTERS.auto_code]: 'کد پرسنلی خودکار',
  };

  const toggleSelected = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const handleBulkDelete = async () => {
    if (!isAdmin() || selectedIds.length === 0) return;
    if (!window.confirm(`حذف ${selectedIds.length} پرسنل انتخاب‌شده؟`)) return;
    setDeleting(true);
    try {
      const res = await api.post('/personnel-contacts/bulk-delete', { ids: selectedIds });
      alert(res.data.message);
      setSelectedIds([]);
      fetchContacts();
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    } finally {
      setDeleting(false);
    }
  };

  const handleFindDuplicates = async () => {
    setDupLoading(true);
    try {
      await refreshDuplicates();
      setDashFilter(FILTERS.duplicates);
      setDupOpen(true);
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    } finally {
      setDupLoading(false);
    }
  };

  const handleMergePair = async ({ firstId, secondId, mode, fieldChoices }) => {
    setMerging(true);
    try {
      const res = await api.post('/personnel-contacts/merge', { firstId, secondId, mode, fieldChoices });
      setSelectedIds((ids) => ids.filter((id) => id !== res.data.deletedId));
      await fetchContacts();
      return { ok: true, data: res.data };
    } catch (err) {
      return {
        ok: false,
        message: err.response?.data?.message || err.message,
        conflicts: err.response?.data?.conflicts || [],
      };
    } finally {
      setMerging(false);
    }
  };

  const handleExport = async () => {
    if (filtered.length === 0) {
      alert('برای این فیلتر رکوردی وجود ندارد');
      return;
    }
    setExporting(true);
    try {
      const ids = filtered.map((c) => c.id).join(',');
      const res = await api.get('/excel/export/personnel', {
        responseType: 'blob',
        params: { ids },
      });
      const slug = dashFilter === FILTERS.all && !searchTerm ? 'all' : dashFilter;
      downloadBlob(res.data, `personnel-${slug}-${Date.now()}.xlsx`);
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

  const columns = [];
  if (isAdmin()) {
    columns.push({
      key: 'select',
      header: '',
      className: 'w-12 text-center',
      render: (c) => (
        <input
          type="checkbox"
          className="salary-select-dot"
          checked={selectedIds.includes(c.id)}
          onChange={() => toggleSelected(c.id)}
          onClick={(e) => e.stopPropagation()}
          aria-label="انتخاب پرسنل"
        />
      ),
    });
  }
  columns.push(
    { key: 'personnel_code', header: 'پرسنلی' },
    { key: 'national_id', header: 'کد ملی', render: (c) => c.national_id || '—' },
    { key: 'name', header: 'نام', render: (c) => `${c.first_name} ${c.last_name}` },
    { key: 'father_name', header: 'نام پدر', render: (c) => c.father_name || '—' },
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
  );

  if (isAdmin()) {
    columns.push({
      key: 'actions',
      header: 'عملیات',
      render: (c) => (
        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
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
        description="کارت‌ها را بزنید تا فهرست فیلتر شود · خروجی اکسل از همین فهرست · جستجو Ctrl+K"
        actions={(
          <div className="flex flex-wrap gap-2 items-center">
            <Button variant="secondary" onClick={handleExport} disabled={exporting || filtered.length === 0}>
              {exporting ? 'در حال آماده‌سازی...' : `خروجی اکسل (${filtered.length})`}
            </Button>
            {isAdmin() && (
              <>
                {selectedIds.length > 0 && (
                  <Button variant="danger" onClick={handleBulkDelete} disabled={deleting}>
                    {deleting ? 'در حال حذف...' : `حذف انتخاب‌شده (${selectedIds.length})`}
                  </Button>
                )}
                <Button variant="secondary" onClick={handleFindDuplicates} disabled={dupLoading}>
                  {dupLoading ? 'در حال بررسی...' : 'یافتن موارد مشابه'}
                </Button>
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
            ستون‌های اکسل: کد پرسنلی، کد ملی (اختیاری)، نام و نام خانوادگی پرسنل، نام پدر، شبا (الزامی)، نام صاحب حساب، شماره تماس، محل تولد
          </p>
        )}
      </PageHeader>

      <PersonnelStatCards
        cards={statCards}
        activeKey={dashFilter}
        onSelect={(key) => {
          setDashFilter(key);
          setSelectedIds([]);
        }}
      />

      <p className="text-sm ui-muted">
        نمایش {filtered.length} مورد
        {dashFilter !== FILTERS.all ? ` از فیلتر «${filterLabels[dashFilter]}»` : ''}
        {searchTerm ? ` با جستجو «${searchTerm}»` : ''}
      </p>
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
                required={field.required}
              />
            ))}
            <div className="md:col-span-3 flex gap-3">
              <Button type="submit" disabled={loading}>ذخیره</Button>
              <Button type="button" variant="secondary" onClick={() => { setShowForm(false); setEditingId(null); setFormData(emptyForm()); }}>انصراف</Button>
            </div>
          </form>
        </Card>
      )}

      <DataTable
        columns={columns}
        rows={filtered}
        emptyText="مخاطبی یافت نشد"
        getRowStyle={(c) => (selectedIds.includes(c.id) ? { background: 'var(--primary-soft)' } : undefined)}
        onRowClick={isAdmin() ? (c) => toggleSelected(c.id) : undefined}
      />

      {isAdmin() && (
        <PersonnelDuplicatesModal
          open={dupOpen}
          groups={dupGroups}
          merging={merging}
          onClose={() => !merging && setDupOpen(false)}
          onMergePair={handleMergePair}
        />
      )}
    </div>
  );
}

export default PersonnelContactsPage;
