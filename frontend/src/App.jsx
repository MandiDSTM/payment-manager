import React, { useState, useEffect, useMemo } from 'react';
import {
  getAuthToken,
  getCurrentUser,
  fetchMe,
  logout,
  ROLES,
} from './api';
import LoginPage from './pages/LoginPage';
import PaymentsPage from './pages/PaymentsPage';
import BusinessContactsPage from './pages/BusinessContactsPage';
import MachinesPage from './pages/MachinesPage';
import MachineryContactsPage from './pages/MachineryContactsPage';
import CommercialPaymentsPage from './pages/CommercialPaymentsPage';
import MachineryPaymentsPage from './pages/MachineryPaymentsPage';
import SalaryPaymentsPage from './pages/SalaryPaymentsPage';
import PersonnelContactsPage from './pages/PersonnelContactsPage';
import PermissionSerialsPage from './pages/PermissionSerialsPage';
import ExcelOperationsPage from './pages/ExcelOperationsPage';
import UsersPage from './pages/UsersPage';
import ThemePicker from './components/ui/ThemePicker';
import { Button } from './components/ui';

const NAV_GROUPS = [
  {
    id: 'payments',
    label: 'پرداخت‌ها',
    items: [
      { id: 'payments', label: 'عمومی', icon: '💰' },
      { id: 'commercial-payments', label: 'تجاری', icon: '🛒' },
      { id: 'machinery-payments', label: 'ماشین‌آلات', icon: '🚧' },
      { id: 'salary-payments', label: 'حقوق', icon: '💼' },
      { id: 'permission-serials', label: 'مجوز پرداخت', icon: '🔐' },
      { id: 'excel', label: 'Excel', icon: '📊' },
    ],
  },
  {
    id: 'contacts',
    label: 'مخاطبین',
    items: [
      { id: 'business', label: 'تجاری', icon: '🏢' },
      { id: 'personnel', label: 'پرسنل', icon: '👤' },
      { id: 'machines', label: 'ماشین‌ها', icon: '🚜' },
      { id: 'machinery', label: 'مخاطبین ماشین', icon: '👷' },
    ],
  },
  {
    id: 'system',
    label: 'سیستم',
    items: [
      { id: 'users', label: 'کاربران', icon: '👥', adminOnly: true },
    ],
  },
];

function App() {
  const [authenticated, setAuthenticated] = useState(Boolean(getAuthToken()));
  const [user, setUser] = useState(getCurrentUser());
  const [activeTab, setActiveTab] = useState('payments');
  const [booting, setBooting] = useState(Boolean(getAuthToken()));

  const refreshSession = async () => {
    try {
      const me = await fetchMe();
      setUser(me);
      setAuthenticated(true);
    } catch {
      setAuthenticated(false);
      setUser(null);
    } finally {
      setBooting(false);
    }
  };

  useEffect(() => {
    if (getAuthToken()) {
      refreshSession();
    } else {
      setBooting(false);
    }

    const onLogout = () => {
      setAuthenticated(false);
      setUser(null);
    };
    window.addEventListener('auth:logout', onLogout);
    return () => window.removeEventListener('auth:logout', onLogout);
  }, []);

  const flatTabs = useMemo(() => {
    return NAV_GROUPS.flatMap((g) => g.items).filter(
      (tab) => !tab.adminOnly || user?.role === 'admin',
    );
  }, [user?.role]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (!e.altKey || e.ctrlKey || e.metaKey) return;
      const num = Number(e.key);
      if (!num || num < 1 || num > flatTabs.length) return;
      e.preventDefault();
      setActiveTab(flatTabs[num - 1].id);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [flatTabs]);

  const handleLoginSuccess = async () => {
    await refreshSession();
  };

  const handleLogout = () => {
    logout();
    setAuthenticated(false);
    setUser(null);
  };

  if (booting) {
    return (
      <div className="ui-app-bg flex items-center justify-center" dir="rtl">
        <p className="ui-muted">در حال بارگذاری...</p>
      </div>
    );
  }

  if (!authenticated) {
    return <LoginPage onSuccess={handleLoginSuccess} />;
  }

  const renderPage = () => {
    switch (activeTab) {
      case 'payments':
        return <PaymentsPage />;
      case 'excel':
        return <ExcelOperationsPage />;
      case 'permission-serials':
        return <PermissionSerialsPage />;
      case 'commercial-payments':
        return <CommercialPaymentsPage />;
      case 'machinery-payments':
        return <MachineryPaymentsPage />;
      case 'salary-payments':
        return <SalaryPaymentsPage />;
      case 'business':
        return <BusinessContactsPage />;
      case 'personnel':
        return <PersonnelContactsPage />;
      case 'machines':
        return <MachinesPage />;
      case 'machinery':
        return <MachineryContactsPage />;
      case 'users':
        return <UsersPage />;
      default:
        return <PaymentsPage />;
    }
  };

  return (
    <div className="ui-app-bg p-4 md:p-8" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="ui-card p-5 md:p-6 space-y-5">
          <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4">
            <div>
              <h1 className="text-2xl font-black" style={{ color: 'var(--text)' }}>
                مدیریت مالی
              </h1>
              <p className="text-sm ui-muted mt-1">ناوبری با Alt+عدد · فرم‌ها با Enter بین فیلدها</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <ThemePicker />
              <div
                className="text-sm rounded-xl px-4 py-2 border"
                style={{
                  background: 'var(--surface-2)',
                  borderColor: 'var(--border)',
                  color: 'var(--text)',
                }}
              >
                <span className="font-bold">{user?.name}</span>
                <span className="ui-muted mx-2">|</span>
                <span className="ui-muted">{ROLES[user?.role]?.label || user?.role}</span>
              </div>
              <Button variant="secondary" onClick={handleLogout}>خروج</Button>
            </div>
          </div>

          <nav className="space-y-3">
            {NAV_GROUPS.map((group) => {
              const items = group.items.filter(
                (tab) => !tab.adminOnly || user?.role === 'admin',
              );
              if (items.length === 0) return null;
              return (
                <div key={group.id} className="space-y-2">
                  <p className="text-xs font-bold ui-muted px-1">{group.label}</p>
                  <div className="flex flex-wrap gap-2">
                    {items.map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        className={`ui-nav-btn ${activeTab === tab.id ? 'active' : ''}`}
                      >
                        <span className="ml-1">{tab.icon}</span>
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </nav>
        </header>

        <main>{renderPage()}</main>
      </div>
    </div>
  );
}

export default App;
