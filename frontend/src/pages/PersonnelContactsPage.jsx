import React, { useState, useEffect } from 'react';
import api, { isAdmin } from '../api';

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

  const fetchContacts = async () => {
    const res = await api.get('/personnel-contacts');
    setContacts(res.data.data || []);
  };

  useEffect(() => { fetchContacts(); }, []);

  const filtered = contacts.filter((c) =>
    [c.personnel_code, c.first_name, c.last_name, c.sheba].join(' ').toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingId) {
        await api.put(`/personnel-contacts/${editingId}`, formData);
      } else {
        await api.post('/personnel-contacts', formData);
      }
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

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold">مخاطبین پرسنل</h2>
          {isAdmin() && (
            <button type="button" onClick={() => { setEditingId(null); setFormData(emptyForm()); setShowForm(true); }}
              className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold">+ پرسنل جدید</button>
          )}
        </div>
        <input type="text" placeholder="جستجو..." className="w-full border rounded-xl px-5 py-3 bg-slate-50"
          value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </div>

      {showForm && isAdmin() && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {FIELDS.map((field) => (
              <div key={field.name} className={field.fullWidth ? 'md:col-span-3' : ''}>
                <label className="text-sm block mb-1">{field.label}{field.required && ' *'}</label>
                <input type="text" className="w-full border rounded-lg px-3 py-2"
                  value={formData[field.name]} onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })} />
              </div>
            ))}
            <div className="md:col-span-3 flex gap-3">
              <button type="submit" disabled={loading} className="bg-green-600 text-white px-6 py-2 rounded-lg">ذخیره</button>
              <button type="button" onClick={() => setShowForm(false)} className="bg-slate-200 px-6 py-2 rounded-lg">انصراف</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-100"><tr>
            <th className="p-3 text-right">پرسنلی</th>
            <th className="p-3 text-right">نام</th>
            <th className="p-3 text-right">شبا</th>
            <th className="p-3 text-right">صاحب حساب</th>
            {isAdmin() && <th className="p-3">عملیات</th>}
          </tr></thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} className="border-t hover:bg-slate-50">
                <td className="p-3">{c.personnel_code}</td>
                <td className="p-3">{c.first_name} {c.last_name}</td>
                <td className="p-3 font-mono text-xs">{c.sheba}</td>
                <td className="p-3">{c.account_holder_name}</td>
                {isAdmin() && (
                  <td className="p-3">
                    <button type="button" className="text-blue-600 ml-2" onClick={() => {
                      setEditingId(c.id);
                      setFormData(Object.fromEntries(FIELDS.map((f) => [f.name, c[f.name] || ''])));
                      setShowForm(true);
                    }}>ویرایش</button>
                    <button type="button" className="text-red-600" onClick={async () => {
                      if (!window.confirm('حذف؟')) return;
                      try {
                        await api.delete(`/personnel-contacts/${c.id}`);
                        fetchContacts();
                      } catch (err) { alert(err.response?.data?.message || err.message); }
                    }}>حذف</button>
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

export default PersonnelContactsPage;
