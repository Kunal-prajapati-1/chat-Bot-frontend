
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

const Login = ({ onSuccess, onSwitch }) => {
  const API_URL = import.meta.env.VITE_API_URL;

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  function handleChange(e) {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (submitting) return;

    setSubmitting(true);
    setError("");

    try {
      await axios.post(
        `${API_URL}/auth/login`,
        {
          email: form.email,
          password: form.password,
        },
        {
          withCredentials: true,
        },
      );

      if (onSuccess) {
        onSuccess();
      } else {
        navigate("/");
      }
    } catch (err) {
      console.error("Login failed:", err);

      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          "Unable to sign in. Please check your details and try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-card" role="main" aria-labelledby="login-heading">
      <header className="auth-header">
        <h1 id="login-heading">Sign in</h1>
        <p className="auth-sub">Welcome back. We've missed you.</p>
      </header>

      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="field-group">
          <label htmlFor="login-email">Email</label>
          <input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={handleChange}
            required
          />
        </div>

        <div className="field-group">
          <label htmlFor="login-password">Password</label>
          <input
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="Your password"
            value={form.password}
            onChange={handleChange}
            required
          />
        </div>

        {error && (
          <p className="auth-error" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          className="primary-btn"
          disabled={submitting}
        >
          {submitting ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <p className="auth-alt">
        Need an account?{" "}
        {onSwitch ? (
          <button
            type="button"
            className="auth-switch-btn"
            onClick={onSwitch}
          >
            Create one
          </button>
        ) : (
          <Link to="/register">Create one</Link>
        )}
      </p>
    </div>
  );
};

export default Login;
