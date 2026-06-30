import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, LogIn, Mail, Sparkles } from 'lucide-react';
import './Login.css';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const enterWorkspace = (user) => {
    localStorage.setItem('canvascraft_demo_logged_in', 'true');
    localStorage.setItem('canvascraft_demo_user', JSON.stringify(user));
    navigate('/dashboard', { replace: true });
  };

  const handleLogin = (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Please enter email and password.');
      return;
    }

    enterWorkspace({
      name: email.split('@')[0] || 'FlowCraft User',
      email
    });
  };

  const handleDemoLogin = () => {
    enterWorkspace({
      name: 'Demo User',
      email: 'demo@flowcraft.local'
    });
  };

  return (
    <main className="login-page">
      <section className="login-panel glass-panel animate-pop">
        <div className="login-brand">
          <div className="login-logo">
            <Sparkles size={26} />
          </div>
          <span>FlowCraft</span>
        </div>

        <div className="login-copy">
          <h1>Welcome back</h1>
          <p>Sign in to continue designing flows, diagrams, and workspace blueprints.</p>
        </div>

        <form className="login-form" onSubmit={handleLogin}>
          {error && <div className="login-error">{error}</div>}

          <label className="login-field">
            <span>Email address</span>
            <div className="login-input-wrap">
              <Mail size={18} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
          </label>

          <label className="login-field">
            <span>Password</span>
            <div className="login-input-wrap">
              <Lock size={18} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
              />
            </div>
          </label>

          <div className="login-options">
            <label>
              <input type="checkbox" />
              Remember me
            </label>
            <button type="button">Forgot password?</button>
          </div>

          <button className="btn btn-primary login-button" type="submit">
            <LogIn size={18} />
            Sign In
          </button>
        </form>

        <div className="login-divider">
          <span>or</span>
        </div>

        <button className="login-demo-link" onClick={handleDemoLogin}>
          Continue with demo account
        </button>
      </section>
    </main>
  );
}
