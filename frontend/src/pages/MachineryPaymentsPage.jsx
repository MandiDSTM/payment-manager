import React, { useState, useEffect, useMemo, useRef } from 'react';
import api, { isAdmin, canEditCommercialPayment, isSelectablePermit, fileUrl } from '../api';
import {
  Button, Card, PageHeader, SearchInput, SelectField, StatusTabs, TextInput, DataTable,
} from '../components/ui';
import PaymentExcelImport from '../components/PaymentExcelImport';
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
  machinery_contact_id: '',
  amount: '',
  category_id: '',
  month: 'فروردین',
  executor_id: '',
  project_id: '',
  permission_serial_id: '',
  status: 'ثبت نشده',
});

function buildPreviewDescription({ categoryName, month, machineName, executorName, serialNumber, projectName }) {
  if (!categoryName || !machineName || !executorName || !serialNumber || !projectName) return '';
  const tail = `${machineName} - ${executorName} - ${serialNumber} / ${projectName}`;
  if (categoryName === MONTHLY_WORK) return `کارکرد ${month} - ${tail}`;
  return `${categoryName} ماشین آلات - ${tail}`;
}

function MachineryPaymentsPage() {
  const [activeStatus, setActiveStatus] = useState(STATUS_TABS[0].value);
  const [payments, setPayments] = useState([]);
  const [contacts, setContacts] = useState([]);
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
    const [c, cat, mo, ex, pr, se] = await Promise.all([
      api.get('/machinery-contacts'),
      api.get('/machinery-payment-categories'),
      api.get('/persian-months'),
      api.get('/executors'),
      api.get('/projects'),
      api.get('/permission-serials'),
    ]);
    setContacts(c.data.data || []);
    setCategories(cat.data.data || []);
    setMonths(mo.data.data || []);
    setExecutors(ex.data.data || []);
    setProjects(pr.data.data || []);
    setSerials(se.data.data || []);
  };

  const fetchPayments = async () => {
    try {
      const res = await api.get('/machinery-payments', { params: { status: activeStatus } });
      setPayments(res.data.data || []);
    } catch (err) {
      console.error(err);
    }
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
    const contact = contacts.find((c) => c.id === Number(formData.machinery_contact_id));
    const category = categories.find((c) => c.id === Number(formData.category_id));
    const executor = executors.find((e) => e.id === Number(formData.executor_id));
    const project = projects.find((p) => p.id === Number(formData.project_id));
    const serial = serials.find((s) => s.id === Number(formData.permission_serial_id));
    return buildPreviewDescription({
      categoryName: category?.name,
      month: formData.month,
      machineName: contact?.machine_name,
      executorName: executor?.name,
      serialNumber: serial?.serial_number,
      projectName: project?.name,
    });
  }, [formData, contacts, categories, executors, projects, serials]);

  const filtered = payments.filter((p) => {
    const text = [p.account_code, p.machine_name, p.executor_name, p.project_name, p.serial_number, p.description, p.category_name, p.month]
      .join(' ').toLowerCase();
    return text.includes(searchTerm.toLowerCase());
  });

  const openCreate = () => {
    setEditingId(null);
    setFormData(emptyForm());
    setShowForm(true);
  };

  const openEdit = (payment) => {
    if (payment.status === 'پرداخت شده') {
      alert('پرداخت انجام‌شده قابل ویرایش نیست');
      return;
    }
    setEditingId(payment.id);
    setFormData({
      machinery_contact_id: payment.machinery_contact_id,
      amount: payment.amount,
      category_id: payment.category_id,
      month: payment.month,
      executor_id: payment.executor_id,
      project_id: payment.project_id,
      permission_serial_id: payment.permission_serial_id,
      status: payment.status,
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
    try {
      if (editingId) {
        await api.put(`/machinery-payments/${editingId}`, formData);
        alert('پرداخت بروزرسانی شد');
      } else {
        await api.post('/machinery-payments', formData);
        alert('پرداخت ثبت شد');
      }
      closeForm();
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

  const handleDelete = async (id) => {
    if (!window.confirm('آیا از حذف این پرداخت اطمینان دارید؟')) return;
    try {
      await api.delete(`/machinery-payments/${id}`);
      fetchPayments();
      fetchLookups();
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  const handleReceiptUpload = async (id, file) => {
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    try {
      await api.post(`/machinery-payments/${id}/receipt`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      fetchPayments();
      alert('فیش واریزی ذخیره شد');
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  const set = (key) => (e) => setFormData({ ...formData, [key]: e.target.value });

  const columns = [
    { key: 'account_code', header: 'کد طرف حساب' },
    { key: 'machine_name', header: 'ماشین' },
    { key: 'amount', header: 'مبلغ', render: (p) => <span className="ui-amount">{formatAmount(p.amount)}</span> },
    { key: 'category_name', header: 'دسته' },
    { key: 'month', header: 'ماه' },
    { key: 'executor_name', header: 'مجری' },
    { key: 'project_name', header: 'پروژه' },
    { key: 'serial_number', header: 'سریال' },
    {
      key: 'description',
      header: 'توضیحات',
      render: (p) => <span className="max-w-xs truncate inline-block" title={p.description}>{p.description}</span>,
    },
    { key: 'recorded_by_name', header: 'ثبت‌کننده', render: (p) => p.recorded_by_name || '—' },
    {
      key: 'receipt',
      header: 'فیش',
      render: (p) => (p.receipt_file_path ? (
        <a href={fileUrl(p.receipt_file_path)} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)' }}>مشاهده</a>
      ) : canEditCommercialPayment() ? (
        <label className="cursor-pointer" style={{ color: 'var(--primary)' }}>
          آپلود
          <input type="file" className="hidden" accept="image/*,.pdf" onChange={(e) => handleReceiptUpload(p.id, e.target.files[0])} />
        </label>
      ) : '—'),
    },
  ];

  if (canEditCommercialPayment()) {
    columns.push({
      key: 'actions',
      header: 'عملیات',
      render: (p) => (
        <div className="flex gap-2">
          {p.status !== 'پرداخت شده' && <Button variant="ghost" onClick={() => openEdit(p)}>ویرایش</Button>}
          {isAdmin() && p.status !== 'پرداخت شده' && !p.accounting_document_registered && (
            <Button variant="danger" onClick={() => handleDelete(p.id)}>حذف</Button>
          )}
        </div>
      ),
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="پرداخت ماشین‌آلات"
        description="جابجایی فیلدها با Enter · جستجو با Ctrl+K · ورود گروهی با اکسل"
        actions={canEditCommercialPayment() && (
          <div className="flex flex-wrap gap-2 items-center">
            <Button onClick={openCreate}>ثبت پرداخت جدید</Button>
            <PaymentExcelImport
              kind="machinery"
              variant="toolbar"
              onDone={() => { fetchPayments(); fetchLookups(); }}
            />
          </div>
        )}
      >
        <StatusTabs tabs={STATUS_TABS} value={activeStatus} onChange={setActiveStatus} />
        <SearchInput
          inputRef={searchRef}
          className="mt-3"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="جستجو در پرداخت‌ها..."
        />
        {canEditCommercialPayment() && (
          <p className="text-xs ui-muted mt-2">
            ستون‌های اکسل: کد طرف حساب، مبلغ، دسته‌بندی، ماه، مجری، پروژه، سریال مجوز، وضعیت
          </p>
        )}
      </PageHeader>

      {showForm && (
        <Card className="p-5 md:p-6 space-y-4">
          <h3 className="text-lg font-bold">{editingId ? 'ویرایش پرداخت' : 'ثبت پرداخت جدید'}</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SelectField label="مخاطب ماشین *" required inputRef={setRef(0)} onKeyDown={(e) => handleKeyDown(e, 0)}
              value={formData.machinery_contact_id} onChange={set('machinery_contact_id')}>
              <option value="">انتخاب کنید</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.account_code} — {c.machine_name} ({c.first_name} {c.last_name})
                </option>
              ))}
            </SelectField>
            <TextInput label="مبلغ (ریال) *" required type="number" min="1" inputRef={setRef(1)}
              onKeyDown={(e) => handleKeyDown(e, 1)} value={formData.amount} onChange={set('amount')} />
            <SelectField label="دسته‌بندی پرداخت *" required inputRef={setRef(2)} onKeyDown={(e) => handleKeyDown(e, 2)}
              value={formData.category_id} onChange={set('category_id')}>
              <option value="">انتخاب کنید</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </SelectField>
            <SelectField label="ماه *" required inputRef={setRef(3)} onKeyDown={(e) => handleKeyDown(e, 3)}
              value={formData.month} onChange={set('month')}>
              {months.map((m) => <option key={m} value={m}>{m}</option>)}
            </SelectField>
            <SelectField label="نام مجری *" required inputRef={setRef(4)} onKeyDown={(e) => handleKeyDown(e, 4)}
              value={formData.executor_id} onChange={set('executor_id')}>
              <option value="">انتخاب کنید</option>
              {executors.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </SelectField>
            <SelectField label="پروژه *" required inputRef={setRef(5)} onKeyDown={(e) => handleKeyDown(e, 5)}
              value={formData.project_id} onChange={set('project_id')}>
              <option value="">انتخاب کنید</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </SelectField>
            <SelectField label="سریال مجوز پرداخت *" required inputRef={setRef(6)} onKeyDown={(e) => handleKeyDown(e, 6)}
              value={formData.permission_serial_id} onChange={set('permission_serial_id')}>
              <option value="">انتخاب کنید</option>
              {availableSerials.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.serial_number}{s.status === 'پرداخت شده' && s.id === Number(formData.permission_serial_id) ? ' (فعلی)' : ''}
                </option>
              ))}
            </SelectField>
            <SelectField label="وضعیت پرداخت" inputRef={setRef(7)} onKeyDown={(e) => handleKeyDown(e, 7)}
              value={formData.status} onChange={set('status')}>
              {STATUS_TABS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </SelectField>
            <div className="md:col-span-2 rounded-xl p-4 text-sm border" style={{ background: 'var(--surface-2)', borderColor: 'var(--border)' }}>
              <span className="font-bold">توضیحات (خودکار): </span>{previewDescription || '—'}
            </div>
            <div className="md:col-span-2 flex gap-3">
              <Button type="submit" disabled={loading}>{loading ? 'در حال ذخیره...' : 'ذخیره'}</Button>
              <Button type="button" variant="secondary" onClick={closeForm}>انصراف</Button>
            </div>
          </form>
        </Card>
      )}

      <DataTable columns={columns} rows={filtered} emptyText="پرداختی در این وضعیت یافت نشد" />
    </div>
  );
}

export default MachineryPaymentsPage;
