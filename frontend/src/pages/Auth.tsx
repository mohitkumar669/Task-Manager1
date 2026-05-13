import React, { useState } from 'react';
import './Auth.css';

interface AuthProps {
  onLogin: (token: string, user: any) => void;
}

const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [passStrength, setPassStrength] = useState({ score: 0, label: '', color: '' });
  const [showPassword, setShowPassword] = useState(false);

  const checkPasswordStrength = (pass: string) => {
    let score = 0;
    if (pass.length > 7) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[a-z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;

    if (pass.length === 0) return { score: 0, label: '', color: '' };
    if (score < 2) return { score, label: 'Weak', color: 'var(--red)' };
    if (score < 4) return { score, label: 'Medium', color: 'var(--orange)' };
    return { score, label: 'Strong', color: 'var(--green)' };
  };

  const handlePasswordChange = (val: string) => {
    setPassword(val);
    setPassStrength(checkPasswordStrength(val));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isLogin) {
      const nameRegex = /^[a-zA-Z\s]{2,30}$/;
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const passRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d\W_]{8,}$/;

      if (!nameRegex.test(name)) return setError('Please enter a valid name (2-30 letters only)');
      if (!emailRegex.test(email)) return setError('Please enter a valid email address');
      if (!passRegex.test(password)) return setError('Password must be 8+ characters with at least one letter and one number');
    }

    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    const body = isLogin ? { email, password } : { name, email, password };

    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong');
      if (isLogin) {
        onLogin(data.token, data.user);
      } else {
        setIsLogin(true);
        setPassword('');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const quickLogin = (e: string, p: string) => {
    setEmail(e);
    setPassword(p);
  };

  return (
    <div id="auth-screen">
      <div className="auth-wrap">
        <div className="auth-left">
          <div className="auth-logo">
            <div className="auth-logo-icon">
              <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
            </div>
            <span className="auth-logo-text">TaskFlow</span>
          </div>
          <div className="auth-left-content">
            <div className="auth-tagline">Manage work,<br/><span>not chaos.</span></div>
            <p className="auth-sub">A modern project management platform with real-time task tracking, role-based access, and beautiful dashboards.</p>
          </div>
          <div className="auth-badges">
            <div className="badge">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
              RBAC
            </div>
            <div className="badge">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
              Analytics
            </div>
            <div className="badge">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"></path></svg>
              Real-time
            </div>
            <div className="badge">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>
              Responsive
            </div>
          </div>
        </div>
        <div className="auth-right">
          <div>
            <h2>Welcome back</h2>
            <p>Sign in to your workspace</p>
          </div>
          <div className="tabs">
            <div className={`tab ${isLogin ? 'active' : ''}`} onClick={() => setIsLogin(true)}>Sign In</div>
            <div className={`tab ${!isLogin ? 'active' : ''}`} onClick={() => setIsLogin(false)}>Sign Up</div>
          </div>

          {error && <div style={{ color: 'var(--red)', fontSize: '13px' }}>{error}</div>}

          <form onSubmit={handleSubmit} autoComplete="off" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {!isLogin && (
              <div className="form-group">
                <label>Full Name</label>
                <input type="text" required value={name} onChange={e => setName(e.target.value)} placeholder="Alex Johnson" />
              </div>
            )}
            <div className="form-group">
              <label>Email</label>
              <input type="email" required autoComplete="off" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" />
            </div>
            <div className="form-group">
              <label>Password</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type={showPassword ? "text" : "password"} 
                  required 
                  autoComplete="new-password"
                  value={password} 
                  onChange={e => handlePasswordChange(e.target.value)} 
                  placeholder="••••••••" 
                  style={{ width: '100%', paddingRight: '40px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--muted)',
                    padding: '0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                  ) : (
                    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                  )}
                </button>
              </div>
              {!isLogin && password.length > 0 && (
                <div style={{ marginTop: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--muted)' }}>Strength: <strong style={{ color: passStrength.color }}>{passStrength.label}</strong></span>
                  </div>
                  <div style={{ height: '3px', background: 'var(--border2)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(passStrength.score / 5) * 100}%`, background: passStrength.color, transition: 'all 0.3s' }}></div>
                  </div>
                </div>
              )}
            </div>
            {/* Role selection removed - defaulting to member */}
            <button type="submit" className="btn btn-primary btn-full">
              {isLogin ? 'Sign In →' : 'Create Account →'}
            </button>
          </form>

          {isLogin && (
            <div className="auth-demo">
              <p>Quick Demo Login</p>
              <div className="demo-users">
                <div className="demo-user" onClick={() => quickLogin('admin@taskflow.io', 'Admin123')}>
                  <span>admin@taskflow.io</span><strong>Admin</strong>
                </div>
                <div className="demo-user" onClick={() => quickLogin('pushpamkumar669@gmail.com', 'Pushp@m009')}>
                  <span>pushpamkumar669@gmail.com</span><strong>Member</strong>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;
