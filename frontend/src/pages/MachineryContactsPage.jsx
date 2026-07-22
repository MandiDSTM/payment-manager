import React, { useState, useEffect } from 'react';
import api, { isAdmin } from '../api';

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

const emptyForm = () =>
  Object.fromEntries(FIELDS.map((f) => [f.name, '']));

function MachineryContactsPage() {
  const [contacts, setContacts] = useState([]);
  const [machines, setMachines] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState(emptyForm());
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

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

  useEffect(() => {
    fetchData();
  }, []);

  const filtered = contacts.filter((c) => {
    const text = [
      c.account_code,
      c.first_name,
      c.last_name,
      c.machine_name,
      c.plate,
      c.sheba,
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
    e.preventDefault();
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

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <h2 className="text-lg font-bold text-slate-700">مخاطبین ماشین‌آلات</h2>
          <div className="flex flex-wrap gap-3">
            {isAdmin() && (
              <>
                <button
                  type="button"
                  onClick={openCreate}
                  className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-blue-700"
                >
                  ➕ مخاطب جدید
                </button>
                <label
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm cursor-pointer ${
                    uploading ? 'bg-slate-300' : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  }`}
                >
                  <span>{uploading ? 'در حال پردازش...' : '📤 آپلود اکسل'}</span>
                  <input
                    type="file"
                    className="hidden"
                    accept=".xlsx,.xls"
                    onChange={handleFileUpload}
                    disabled={uploading}
                  />
                </label>
              </>
            )}
          </div>
        </div>
        <input
          type="text"
          placeholder="جستجو در نام، کد طرف حساب، پلاک، شبا..."
          className="w-full border border-slate-200 rounded-xl px-5 py-3 outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {isAdmin() && (
          <p className="text-xs text-slate-500">
            ستون‌های اکسل: کد طرف حساب، نام، نام خانوادگی، نام ماشین، پلاک، شبا، نام صاحب حساب، موبایل، شهر، توضیحات
          </p>
        )}
      </div>

      {showForm && isAdmin() && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold mb-4 text-slate-700">
            {editingId ? 'ویرایش مخاطب' : 'ثبت مخاطب جدید'}
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {FIELDS.map((field) => (
              <div key={field.name} className={field.fullWidth ? 'md:col-span-3' : ''}>
                <label className="text-sm text-gray-600 mb-1 block">
                  {field.label}
                  {field.required && <span className="text-red-500"> *</span>}
                </label>
                {field.type === 'select' ? (
                  <select
                    value={formData[field.name]}
                    onChange={(e) =>
                      setFormData({ ...formData, [field.name]: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:border-blue-500 outline-none bg-white"
                    required
                  >
                    <option value="">انتخاب ماشین...</option>
                    {machines.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={formData[field.name]}
                    onChange={(e) =>
                      setFormData({ ...formData, [field.name]: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:border-blue-500 outline-none"
                  />
                )}
              </div>
            ))}
            <div className="md:col-span-3 flex gap-3 mt-2">
              <button
                type="submit"
                disabled={loading}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'در حال ذخیره...' : 'ذخیره'}
              </button>
              <button
                type="button"
                onClick={closeForm}
                className="bg-slate-200 text-slate-700 px-6 py-2 rounded-lg hover:bg-slate-300"
              >
                انصراف
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right border-collapse">
            <thead className="bg-slate-100 text-slate-600 border-b border-slate-300">
              <tr>
                <th className="p-3">کد طرف حساب</th>
                <th className="p-3">نام</th>
                <th className="p-3">نام خانوادگی</th>
                <th className="p-3">ماشین</th>
                <th className="p-3">پلاک</th>
                <th className="p-3">شبا</th>
                <th className="p-3">صاحب حساب</th>
                {isAdmin() && <th className="p-3 w-28">عملیات</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin() ? 8 : 7} className="p-8 text-center text-slate-400">
                    مخاطبی یافت نشد
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="p-3">{c.account_code}</td>
                    <td className="p-3">{c.first_name}</td>
                    <td className="p-3">{c.last_name}</td>
                    <td className="p-3">{c.machine_name || '—'}</td>
                    <td className="p-3">{c.plate || '—'}</td>
                    <td className="p-3 font-mono text-xs">{c.sheba}</td>
                    <td className="p-3">{c.account_holder_name}</td>
                    {isAdmin() && (
                      <td className="p-3">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(c)}
                            className="text-blue-600 hover:text-blue-800 text-xs font-bold"
                          >
                            ویرایش
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(c.id)}
                            className="text-red-600 hover:text-red-800 text-xs font-bold"
                          >
                            حذف
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2 text-xs text-slate-500 border-t">
          {filtered.length} مخاطب
        </div>
      </div>
    </div>
  );
}

export default MachineryContactsPage;
