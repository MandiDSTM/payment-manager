import React, { useState, useEffect, useMemo } from 'react';
import api, { isAdmin, canEditCommercialPayment, isSelectablePermit } from '../api';

const STATUS_TABS = [
  { value: 'ثبت نشده', label: 'ثبت نشده' },
  { value: 'در انتظار ثبت سند', label: 'در انتظار ثبت سند' },
  { value: 'تکمیل شده', label: 'تکمیل شده' },
];

const emptyForm = () => ({
  business_contact_id: '',
  amount: '',
  category_id: '',
  executor_id: '',
  project_id: '',
  permission_serial_id: '',
  status: 'ثبت نشده',
});

function CommercialPaymentsPage() {
  const [activeStatus, setActiveStatus] = useState(STATUS_TABS[0].value);
  const [payments, setPayments] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [executors, setExecutors] = useState([]);
  const [projects, setProjects] = useState([]);
  const [serials, setSerials] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState(emptyForm());
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchLookups = async () => {
    const [c, cat, ex, pr, se] = await Promise.all([
      api.get('/business-contacts'),
      api.get('/commercial-payment-categories'),
      api.get('/executors'),
      api.get('/projects'),
      api.get('/permission-serials'),
    ]);
    setContacts(c.data.data || []);
    setCategories(cat.data.data || []);
    setExecutors(ex.data.data || []);
    setProjects(pr.data.data || []);
    setSerials(se.data.data || []);
  };

  const fetchPayments = async () => {
    try {
      const res = await api.get('/commercial-payments', { params: { status: activeStatus } });
      setPayments(res.data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchLookups();
  }, []);

  useEffect(() => {
    fetchPayments();
  }, [activeStatus]);

  const availableSerials = useMemo(() => {
    if (!editingId) {
      return serials.filter((s) => isSelectablePermit(s.status));
    }
    const current = payments.find((p) => p.id === editingId);
    return serials.filter(
      (s) => isSelectablePermit(s.status) || s.id === current?.permission_serial_id,
    );
  }, [serials, editingId, payments]);

  const previewDescription = useMemo(() => {
    const contact = contacts.find((c) => c.id === Number(formData.business_contact_id));
    const executor = executors.find((e) => e.id === Number(formData.executor_id));
    const project = projects.find((p) => p.id === Number(formData.project_id));
    const serial = serials.find((s) => s.id === Number(formData.permission_serial_id));
    if (!contact || !executor || !project || !serial) return '';
    return `${contact.business_name} - ${executor.name} - ${serial.serial_number} / ${project.name}`;
  }, [formData, contacts, executors, projects, serials]);

  const filtered = payments.filter((p) => {
    const text = [
      p.business_name,
      p.executor_name,
      p.project_name,
      p.serial_number,
      p.description,
      p.category_name,
    ]
      .join(' ')
      .toLowerCase();
    return text.includes(searchTerm.toLowerCase());
  });

  const openCreate = () => {
    setEditingId(null);
    setFormData(emptyForm());
    setShowForm(true);
  };

  const openEdit = (payment) => {
    setEditingId(payment.id);
    setFormData({
      business_contact_id: payment.business_contact_id,
      amount: payment.amount,
      category_id: payment.category_id,
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
    e.preventDefault();
    setLoading(true);
    try {
      if (editingId) {
        await api.put(`/commercial-payments/${editingId}`, formData);
        alert('پرداخت بروزرسانی شد');
      } else {
        await api.post('/commercial-payments', formData);
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

  const handleDelete = async (id) => {
    if (!window.confirm('آیا از حذف این پرداخت اطمینان دارید؟')) return;
    try {
      await api.delete(`/commercial-payments/${id}`);
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
      await api.post(`/commercial-payments/${id}/receipt`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      fetchPayments();
      alert('فیش واریزی ذخیره شد');
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <h2 className="text-xl font-bold text-slate-800">پرداخت‌های تجاری</h2>
          {canEditCommercialPayment() && (
            <button
              type="button"
              onClick={openCreate}
              className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-blue-700"
            >
              + ثبت پرداخت جدید
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setActiveStatus(tab.value)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                activeStatus === tab.value
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="جستجو در پرداخت‌ها..."
          className="w-full border border-slate-200 rounded-xl px-5 py-3 outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold mb-4">
            {editingId ? 'ویرایش پرداخت' : 'ثبت پرداخت جدید'}
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block text-sm">
              مخاطب تجاری *
              <select
                required
                className="w-full mt-1 border rounded-xl px-3 py-2"
                value={formData.business_contact_id}
                onChange={(e) => setFormData({ ...formData, business_contact_id: e.target.value })}
              >
                <option value="">انتخاب کنید</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.business_name} ({c.account_code})
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm">
              مبلغ (ریال) *
              <input
                required
                type="number"
                min="1"
                className="w-full mt-1 border rounded-xl px-3 py-2"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              />
            </label>

            <label className="block text-sm">
              دسته‌بندی پرداخت *
              <select
                required
                className="w-full mt-1 border rounded-xl px-3 py-2"
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
              >
                <option value="">انتخاب کنید</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </label>

            <label className="block text-sm">
              نام مجری *
              <select
                required
                className="w-full mt-1 border rounded-xl px-3 py-2"
                value={formData.executor_id}
                onChange={(e) => setFormData({ ...formData, executor_id: e.target.value })}
              >
                <option value="">انتخاب کنید</option>
                {executors.map((e) => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
            </label>

            <label className="block text-sm">
              پروژه *
              <select
                required
                className="w-full mt-1 border rounded-xl px-3 py-2"
                value={formData.project_id}
                onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
              >
                <option value="">انتخاب کنید</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </label>

            <label className="block text-sm">
              سریال مجوز پرداخت *
              <select
                required
                className="w-full mt-1 border rounded-xl px-3 py-2"
                value={formData.permission_serial_id}
                onChange={(e) => setFormData({ ...formData, permission_serial_id: e.target.value })}
              >
                <option value="">انتخاب کنید</option>
                {availableSerials.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.serial_number} {s.status === 'پرداخت شده' && s.id === Number(formData.permission_serial_id) ? '(فعلی)' : ''}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm">
              وضعیت پرداخت
              <select
                className="w-full mt-1 border rounded-xl px-3 py-2"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                {STATUS_TABS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </label>

            <div className="md:col-span-2 bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm">
              <span className="font-bold text-slate-600">توضیحات (خودکار): </span>
              {previewDescription || '—'}
            </div>

            <div className="md:col-span-2 flex gap-3">
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold disabled:opacity-50"
              >
                {loading ? 'در حال ذخیره...' : 'ذخیره'}
              </button>
              <button
                type="button"
                onClick={closeForm}
                className="bg-slate-200 text-slate-700 px-6 py-2 rounded-xl font-bold"
              >
                انصراف
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                <th className="p-3 text-right">مخاطب</th>
                <th className="p-3 text-right">مبلغ</th>
                <th className="p-3 text-right">دسته</th>
                <th className="p-3 text-right">مجری</th>
                <th className="p-3 text-right">پروژه</th>
                <th className="p-3 text-right">سریال</th>
                <th className="p-3 text-right">توضیحات</th>
                <th className="p-3 text-right">ثبت‌کننده</th>
                <th className="p-3 text-right">فیش</th>
                {canEditCommercialPayment() && <th className="p-3 text-right">عملیات</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-400">
                    پرداختی در این وضعیت یافت نشد
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="p-3">{p.business_name}</td>
                    <td className="p-3">{Number(p.amount).toLocaleString('fa-IR')}</td>
                    <td className="p-3">{p.category_name}</td>
                    <td className="p-3">{p.executor_name}</td>
                    <td className="p-3">{p.project_name}</td>
                    <td className="p-3">{p.serial_number}</td>
                    <td className="p-3 max-w-xs truncate" title={p.description}>{p.description}</td>
                    <td className="p-3">{p.recorded_by_name || '—'}</td>
                    <td className="p-3">
                      {p.receipt_file_path ? (
                        <a
                          href={`http://localhost:5000/${p.receipt_file_path}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          مشاهده
                        </a>
                      ) : canEditCommercialPayment() ? (
                        <label className="text-indigo-600 cursor-pointer hover:underline">
                          آپلود
                          <input
                            type="file"
                            className="hidden"
                            accept="image/*,.pdf"
                            onChange={(e) => handleReceiptUpload(p.id, e.target.files[0])}
                          />
                        </label>
                      ) : (
                        '—'
                      )}
                    </td>
                    {canEditCommercialPayment() && (
                      <td className="p-3 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => openEdit(p)}
                          className="text-blue-600 hover:underline ml-2"
                        >
                          ویرایش
                        </button>
                        {isAdmin() && (
                          <button
                            type="button"
                            onClick={() => handleDelete(p.id)}
                            className="text-red-600 hover:underline"
                          >
                            حذف
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default CommercialPaymentsPage;
