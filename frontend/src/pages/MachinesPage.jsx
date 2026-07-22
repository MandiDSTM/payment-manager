import React, { useState, useEffect } from 'react';
import api, { isAdmin } from '../api';

function MachinesPage() {
  const [machines, setMachines] = useState([]);
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchMachines = async () => {
    try {
      const res = await api.get('/machines');
      setMachines(res.data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchMachines();
  }, []);

  const resetForm = () => {
    setName('');
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return alert('نام ماشین اجباری است');
    setLoading(true);
    try {
      if (editingId) {
        const res = await api.put(`/machines/${editingId}`, { name });
        alert(res.data.message);
      } else {
        const res = await api.post('/machines', { name });
        alert(res.data.message);
      }
      resetForm();
      fetchMachines();
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (machine) => {
    setEditingId(machine.id);
    setName(machine.name);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('آیا از حذف این ماشین اطمینان دارید؟')) return;
    try {
      const res = await api.delete(`/machines/${id}`);
      alert(res.data.message);
      fetchMachines();
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  return (
    <div className="space-y-6">
      {isAdmin() && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h2 className="text-lg font-bold mb-4 text-slate-700">
            {editingId ? 'ویرایش ماشین' : 'ثبت ماشین جدید'}
          </h2>
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="نام ماشین"
              className="flex-1 border border-slate-200 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-green-600 text-white px-6 py-2 rounded-xl hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? '...' : editingId ? 'بروزرسانی' : 'ثبت'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="bg-slate-200 text-slate-700 px-6 py-2 rounded-xl hover:bg-slate-300"
              >
                انصراف
              </button>
            )}
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-slate-200">
        <div className="p-4 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-700">لیست ماشین‌ها</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right border-collapse">
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className="p-3 w-16">#</th>
                <th className="p-3">نام ماشین</th>
                {isAdmin() && <th className="p-3 w-28">عملیات</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {machines.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin() ? 3 : 2} className="p-8 text-center text-slate-400">
                    ماشینی ثبت نشده است
                  </td>
                </tr>
              ) : (
                machines.map((m, i) => (
                  <tr key={m.id} className="hover:bg-slate-50">
                    <td className="p-3 text-slate-400">{i + 1}</td>
                    <td className="p-3 font-medium">{m.name}</td>
                    {isAdmin() && (
                      <td className="p-3">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleEdit(m)}
                            className="text-blue-600 hover:text-blue-800 text-xs font-bold"
                          >
                            ویرایش
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(m.id)}
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
          {machines.length} ماشین
        </div>
      </div>
    </div>
  );
}

export default MachinesPage;
