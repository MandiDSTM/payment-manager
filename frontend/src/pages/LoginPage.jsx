import React, { useState } from 'react';
import { login, ROLES } from '../api';
import ThemePicker from '../components/ui/ThemePicker';
import { Alert, Button, TextInput } from '../components/ui';
import { useFormKeyboardNav } from '../hooks/useFormKeyboardNav';

function LoginPage({ onSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setLoading(true);
    setError('');
    try {
      await login(username.trim(), password);
      onSuccess?.();
    } catch (err) {
      setError(err.response?.data?.message || 'خطا در ورود به سیستم');
    } finally {
      setLoading(false);
    }
  };

  const { setRef, handleKeyDown } = useFormKeyboardNav({
    fieldCount: 2,
    onSubmitLast: submit,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    await submit();
  };

  return (
    <div className="ui-app-bg flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md ui-card p-8 space-y-6">
        <div className="flex justify-end">
          <ThemePicker />
        </div>

        <div className="text-center space-y-2">
          <div className="text-4xl">🔐</div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--text)' }}>ورود به سامانه</h1>
          <p className="text-sm ui-muted">مدیریت مالی</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <TextInput
            label="نام کاربری"
            inputRef={setRef(0)}
            onKeyDown={(e) => handleKeyDown(e, 0)}
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="admin"
            autoComplete="username"
            required
          />
          <TextInput
            label="رمز عبور"
            inputRef={setRef(1)}
            onKeyDown={(e) => handleKeyDown(e, 1)}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••"
            autoComplete="current-password"
            required
          />

          {error && <Alert variant="error">{error}</Alert>}

          <Button type="submit" disabled={loading} className="w-full py-3">
            {loading ? 'در حال ورود...' : 'ورود'}
          </Button>
        </form>

        <div className="text-xs ui-muted text-center space-y-1 border-t pt-4" style={{ borderColor: 'var(--border)' }}>
          <p>کاربر پیش‌فرض: <span className="font-mono">admin</span> / رمز: <span className="font-mono">123456</span></p>
          <p>نقش‌ها: {Object.values(ROLES).map((r) => r.label).join('، ')}</p>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
