import React, { useState, useEffect, useMemo, useRef } from 'react';
import api, { isAdmin, canEditCommercialPayment, isSelectablePermit } from '../api';
import {
  Button, Card, PageHeader, SearchInput, SelectField, StatusTabs, TextInput, DataTable,
} from '../components/ui';
import PaymentExcelImport from '../components/PaymentExcelImport';
import PaymentExcelExport from '../components/PaymentExcelExport';
import { useFormKeyboardNav } from '../hooks/useFormKeyboardNav';
import { formatAmount } from '../utils/format';

const STATUS_TABS = [
  { value: 'ثبت نشده', label: 'ثبت نشده' },
  { value: 'در انتظار پرداخت', label: 'در انتظار پرداخت' },
  { value: 'در جریان پرداخت', label: 'در جریان پرداخت' },
  { value: 'پرداخت شده', label: 'پرداخت شده' },
];

const MONTHLY_WORK = 'کارکرد ماهانه';

const emptyForm = () => ({
  personnel_contact_id: '',
  amount: '',
  category_id: '',
  month: 'فروردین',
  executor_id: '',
  project_id: '',
  permission_serial_id: '',
  status: 'ثبت نشده',
});

function buildPreview({ categoryName, month, executorName, serialNumber, projectName }) {
  if (!categoryName || !executorName || !serialNumber || !projectName) return '';
  const tail = `${executorName} - ${serialNumber} / ${projectName}`;
  if (categoryName === MONTHLY_WORK) return `کارکرد ${month} - ${tail}`;
  return `${categoryName} - ${tail}`;
}

function SalaryPaymentsPage() {
  const [activeStatus, setActiveStatus] = useState(STATUS_TABS[0].value);
  const [payments, setPayments] = useState([]);
  const [personnel, setPersonnel] = useState([]);
  const [categories, setCategories] = useState([]);
  const [months, setMonths] = useState([]);
  const [executors, setExecutors] = useState([]);
  const [projects, setProjects] = useState([]);
  const [serials, setSerials] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState(emptyForm());
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const searchRef = useRef(null);

  const fetchLookups = async () => {
    const [p, cat, mo, ex, pr, se] = await Promise.all([
      api.get('/personnel-contacts'),
      api.get('/salary-payment-categories'),
      api.get('/persian-months'),
      api.get('/executors'),
      api.get('/projects'),
      api.get('/permission-serials'),
    ]);
    setPersonnel(p.data.data || []);
    setCategories(cat.data.data || []);
    setMonths(mo.data.data || []);
    setExecutors(ex.data.data || []);
    setProjects(pr.data.data || []);
    setSerials(se.data.data || []);
  };

  const fetchPayments = async () => {
    const res = await api.get('/salary-payments', { params: { status: activeStatus } });
    setPayments(res.data.data || []);
  };

  useEffect(() => { fetchLookups(); }, []);
  useEffect(() => { fetchPayments(); }, [activeStatus]);

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

  const availableSerials = useMemo(() => {
    if (!editingId) return serials.filter((s) => isSelectablePermit(s.status));
    const current = payments.find((p) => p.id === editingId);
    return serials.filter((s) => isSelectablePermit(s.status) || s.id === current?.permission_serial_id);
  }, [serials, editingId, payments]);

  const previewDescription = useMemo(() => {
    const category = categories.find((c) => c.id === Number(formData.category_id));
    const executor = executors.find((e) => e.id === Number(formData.executor_id));
    const project = projects.find((p) => p.id === Number(formData.project_id));
    const serial = serials.find((s) => s.id === Number(formData.permission_serial_id));
    return buildPreview({
      categoryName: category?.name,
      month: formData.month,
      executorName: executor?.name,
      serialNumber: serial?.serial_number,
      projectName: project?.name,
    });
  }, [formData, categories, executors, projects, serials]);

  const filtered = payments.filter((p) => {
    const text = [p.personnel_code, p.first_name, p.last_name, p.description, p.category_name, p.month].join(' ').toLowerCase();
    return text.includes(searchTerm.toLowerCase());
  });

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    setLoading(true);
    try {
      if (editingId) await api.put(`/salary-payments/${editingId}`, formData);
      else await api.post('/salary-payments', formData);
      alert('ذخیره شد');
      setShowForm(false);
      setEditingId(null);
      setFormData(emptyForm());
      fetchPayments();
      fetchLookups();
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const { setRef, handleKeyDown, focusFirst } = useFormKeyboardNav({
    fieldCount: 8,
    onSubmitLast: handleSubmit,
  });

  useEffect(() => {
    if (showForm) setTimeout(focusFirst, 50);
  }, [showForm, focusFirst]);

  const set = (key) => (e) => setFormData({ ...formData, [key]: e.target.value });

  const columns = [
    { key: 'personnel_code', header: 'پرسنلی' },
    { key: 'name', header: 'نام', render: (p) => `${p.first_name} ${p.last_name}` },
    { key: 'amount', header: 'مبلغ', render: (p) => <span className="ui-amount">{formatAmount(p.amount)}</span> },
    { key: 'category_name', header: 'دسته' },
    { key: 'month', header: 'ماه' },
    {
      key: 'description',
      header: 'توضیحات',
      render: (p) => <span className="max-w-xs truncate inline-block" title={p.description}>{p.description}</span>,
    },
  ];

  if (canEditCommercialPayment()) {
    columns.push({
      key: 'actions',
      header: 'عملیات',
      render: (p) => (
        <div className="flex gap-2">
          {p.status !== 'پرداخت شده' && (
            <Button variant="ghost" onClick={() => {
              setEditingId(p.id);
              setFormData({
                personnel_contact_id: p.personnel_contact_id,
                amount: p.amount,
                category_id: p.category_id,
                month: p.month,
                executor_id: p.executor_id,
                project_id: p.project_id,
                permission_serial_id: p.permission_serial_id,
                status: p.status,
              });
              setShowForm(true);
            }}>ویرایش</Button>
          )}
          {isAdmin() && p.status !== 'پرداخت شده' && !p.accounting_document_registered && (
            <Button variant="danger" onClick={async () => {
              if (!window.confirm('حذف؟')) return;
              try {
                await api.delete(`/salary-payments/${p.id}`);
                fetchPayments();
                fetchLookups();
              } catch (err) { alert(err.response?.data?.message || err.message); }
            }}>حذف</Button>
          )}
        </div>
      ),
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="پرداخت حقوق"
        description="جابجایی فیلدها با Enter · جستجو با Ctrl+K · ورود گروهی با اکسل"
        actions={(
          <div className="flex flex-wrap gap-2 items-center">
            <PaymentExcelExport
              endpoint="/excel/export/payments/salary"
              filenamePrefix="payments-salary"
            />
            {canEditCommercialPayment() && (
              <>
                <Button onClick={() => { setEditingId(null); setFormData(emptyForm()); setShowForm(true); }}>
                  ثبت پرداخت
                </Button>
                <PaymentExcelImport
                  kind="salary"
                  variant="toolbar"
                  onDone={() => { fetchPayments(); fetchLookups(); }}
                />
              </>
            )}
          </div>
        )}
      >
        <StatusTabs tabs={STATUS_TABS} value={activeStatus} onChange={setActiveStatus} />
        <SearchInput
          inputRef={searchRef}
          className="mt-3"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="جستجو..."
        />
        {canEditCommercialPayment() && (
          <p className="text-xs ui-muted mt-2">
            ستون‌های اجباری اکسل: کد پرسنلی و مبلغ. دسته‌بندی، ماه، مجری، پروژه و سریال بعد از آپلود پرسیده می‌شود.
          </p>
        )}
      </PageHeader>

      {showForm && (
        <Card className="p-5 md:p-6 space-y-4">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SelectField label="پرسنل *" required inputRef={setRef(0)} onKeyDown={(e) => handleKeyDown(e, 0)}
              value={formData.personnel_contact_id} onChange={set('personnel_contact_id')}>
              <option value="">انتخاب</option>
              {personnel.map((p) => (
                <option key={p.id} value={p.id}>{p.personnel_code} — {p.first_name} {p.last_name}</option>
              ))}
            </SelectField>
            <TextInput label="مبلغ *" required type="number" min="1" inputRef={setRef(1)}
              onKeyDown={(e) => handleKeyDown(e, 1)} value={formData.amount} onChange={set('amount')} />
            <SelectField label="دسته‌بندی *" required inputRef={setRef(2)} onKeyDown={(e) => handleKeyDown(e, 2)}
              value={formData.category_id} onChange={set('category_id')}>
              <option value="">انتخاب</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </SelectField>
            <SelectField label="ماه *" required inputRef={setRef(3)} onKeyDown={(e) => handleKeyDown(e, 3)}
              value={formData.month} onChange={set('month')}>
              {months.map((m) => <option key={m} value={m}>{m}</option>)}
            </SelectField>
            <SelectField label="مجری *" required inputRef={setRef(4)} onKeyDown={(e) => handleKeyDown(e, 4)}
              value={formData.executor_id} onChange={set('executor_id')}>
              <option value="">انتخاب</option>
              {executors.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </SelectField>
            <SelectField label="پروژه *" required inputRef={setRef(5)} onKeyDown={(e) => handleKeyDown(e, 5)}
              value={formData.project_id} onChange={set('project_id')}>
              <option value="">انتخاب</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </SelectField>
            <SelectField label="سریال مجوز *" required inputRef={setRef(6)} onKeyDown={(e) => handleKeyDown(e, 6)}
              value={formData.permission_serial_id} onChange={set('permission_serial_id')}>
              <option value="">انتخاب</option>
              {availableSerials.map((s) => <option key={s.id} value={s.id}>{s.serial_number}</option>)}
            </SelectField>
            <SelectField label="وضعیت" inputRef={setRef(7)} onKeyDown={(e) => handleKeyDown(e, 7)}
              value={formData.status} onChange={set('status')}>
              {STATUS_TABS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </SelectField>
            <div className="md:col-span-2 rounded-xl p-4 text-sm border" style={{ background: 'var(--surface-2)', borderColor: 'var(--border)' }}>
              <span className="font-bold">توضیحات (خودکار): </span>{previewDescription || '—'}
            </div>
            <div className="md:col-span-2 flex gap-3">
              <Button type="submit" disabled={loading}>ذخیره</Button>
              <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>انصراف</Button>
            </div>
          </form>
        </Card>
      )}

      <DataTable columns={columns} rows={filtered} emptyText="پرداختی یافت نشد" />
    </div>
  );
}

export default SalaryPaymentsPage;
