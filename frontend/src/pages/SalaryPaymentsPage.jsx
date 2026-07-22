import React, { useState, useEffect, useMemo } from 'react';
import api, { isAdmin, canEditCommercialPayment, isSelectablePermit } from '../api';

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

  const availableSerials = useMemo(() => {
    if (!editingId) return serials.filter((s) => isSelectablePermit(s.status));
    const current = payments.find((p) => p.id === editingId);
    return serials.filter((s) => isSelectablePermit(s.status) || s.id === current?.permission_serial_id);
  }, [serials, editingId, payments]);

  const previewDescription = useMemo(() => {
    const person = personnel.find((p) => p.id === Number(formData.personnel_contact_id));
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
      personName: person ? `${person.first_name} ${person.last_name}` : '',
    });
  }, [formData, personnel, categories, executors, projects, serials]);

  const filtered = payments.filter((p) => {
    const text = [p.personnel_code, p.first_name, p.last_name, p.description, p.category_name, p.month].join(' ').toLowerCase();
    return text.includes(searchTerm.toLowerCase());
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingId) {
        await api.put(`/salary-payments/${editingId}`, formData);
      } else {
        await api.post('/salary-payments', formData);
      }
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

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <h2 className="text-xl font-bold text-slate-800">پرداخت حقوق</h2>
          {canEditCommercialPayment() && (
            <button type="button" onClick={() => { setEditingId(null); setFormData(emptyForm()); setShowForm(true); }}
              className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold">+ ثبت پرداخت</button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {STATUS_TABS.map((tab) => (
            <button key={tab.value} type="button" onClick={() => setActiveStatus(tab.value)}
              className={`px-4 py-2 rounded-xl text-sm font-bold ${activeStatus === tab.value ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
              {tab.label}
            </button>
          ))}
        </div>
        <input type="text" placeholder="جستجو..." className="w-full border rounded-xl px-5 py-3 bg-slate-50"
          value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="text-sm">پرسنل *
              <select required className="w-full mt-1 border rounded-xl px-3 py-2" value={formData.personnel_contact_id}
                onChange={(e) => setFormData({ ...formData, personnel_contact_id: e.target.value })}>
                <option value="">انتخاب</option>
                {personnel.map((p) => (
                  <option key={p.id} value={p.id}>{p.personnel_code} — {p.first_name} {p.last_name}</option>
                ))}
              </select>
            </label>
            <label className="text-sm">مبلغ *
              <input required type="number" min="1" className="w-full mt-1 border rounded-xl px-3 py-2"
                value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} />
            </label>
            <label className="text-sm">دسته‌بندی *
              <select required className="w-full mt-1 border rounded-xl px-3 py-2" value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}>
                <option value="">انتخاب</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <label className="text-sm">ماه *
              <select required className="w-full mt-1 border rounded-xl px-3 py-2" value={formData.month}
                onChange={(e) => setFormData({ ...formData, month: e.target.value })}>
                {months.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </label>
            <label className="text-sm">مجری *
              <select required className="w-full mt-1 border rounded-xl px-3 py-2" value={formData.executor_id}
                onChange={(e) => setFormData({ ...formData, executor_id: e.target.value })}>
                <option value="">انتخاب</option>
                {executors.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </label>
            <label className="text-sm">پروژه *
              <select required className="w-full mt-1 border rounded-xl px-3 py-2" value={formData.project_id}
                onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}>
                <option value="">انتخاب</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
            <label className="text-sm">سریال مجوز *
              <select required className="w-full mt-1 border rounded-xl px-3 py-2" value={formData.permission_serial_id}
                onChange={(e) => setFormData({ ...formData, permission_serial_id: e.target.value })}>
                <option value="">انتخاب</option>
                {availableSerials.map((s) => <option key={s.id} value={s.id}>{s.serial_number}</option>)}
              </select>
            </label>
            <label className="text-sm">وضعیت
              <select className="w-full mt-1 border rounded-xl px-3 py-2" value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                {STATUS_TABS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </label>
            <div className="md:col-span-2 bg-slate-50 border rounded-xl p-4 text-sm">
              <span className="font-bold">توضیحات (خودکار): </span>{previewDescription || '—'}
            </div>
            <div className="md:col-span-2 flex gap-3">
              <button type="submit" disabled={loading} className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold">ذخیره</button>
              <button type="button" onClick={() => setShowForm(false)} className="bg-slate-200 px-6 py-2 rounded-xl">انصراف</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="p-3 text-right">پرسنلی</th>
              <th className="p-3 text-right">نام</th>
              <th className="p-3 text-right">مبلغ</th>
              <th className="p-3 text-right">دسته</th>
              <th className="p-3 text-right">ماه</th>
              <th className="p-3 text-right">توضیحات</th>
              {canEditCommercialPayment() && <th className="p-3">عملیات</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} className="border-t hover:bg-slate-50">
                <td className="p-3">{p.personnel_code}</td>
                <td className="p-3">{p.first_name} {p.last_name}</td>
                <td className="p-3">{Number(p.amount).toLocaleString('fa-IR')}</td>
                <td className="p-3">{p.category_name}</td>
                <td className="p-3">{p.month}</td>
                <td className="p-3 max-w-xs truncate" title={p.description}>{p.description}</td>
                {canEditCommercialPayment() && (
                  <td className="p-3 whitespace-nowrap">
                    {p.status !== 'پرداخت شده' && (
                      <button type="button" className="text-blue-600 ml-2" onClick={() => {
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
                      }}>ویرایش</button>
                    )}
                    {isAdmin() && p.status !== 'پرداخت شده' && !p.accounting_document_registered && (
                      <button type="button" className="text-red-600" onClick={async () => {
                        if (!window.confirm('حذف؟')) return;
                        try {
                          await api.delete(`/salary-payments/${p.id}`);
                          fetchPayments();
                          fetchLookups();
                        } catch (err) { alert(err.response?.data?.message || err.message); }
                      }}>حذف</button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default SalaryPaymentsPage;
