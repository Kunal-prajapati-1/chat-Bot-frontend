
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

const Register = ({ onSuccess, onSwitch }) => {
  const API_URL =
    import.meta.env.VITE_API_URL || "http://localhost:3000";

  const [form, setForm] = useState({
    email: "",
    firstname: "",
    lastname: "",
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
        `${API_URL}/auth/register`,
        {
          email: form.email,
          fullName: {
            firstName: form.firstname,
            lastName: form.lastname,
          },
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
      console.error("Registration failed:", err);

      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          "Unable to create your account. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-card" role="main" aria-labelledby="register-heading">
      <header className="auth-header">
        <h1 id="register-heading">Create account</h1>
        <p className="auth-sub">Join us and start exploring.</p>
      </header>

      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="field-group">
          <label htmlFor="register-email">Email</label>
          <input
            id="register-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={handleChange}
            required
          />
        </div>

        <div className="grid-2">
          <div className="field-group">
            <label htmlFor="register-firstname">First name</label>
            <input
              id="register-firstname"
              name="firstname"
              autoComplete="given-name"
              placeholder="Jane"
              value={form.firstname}
              onChange={handleChange}
              required
            />
          </div>

          <div className="field-group">
            <label htmlFor="register-lastname">Last name</label>
            <input
              id="register-lastname"
              name="lastname"
              autoComplete="family-name"
              placeholder="Doe"
              value={form.lastname}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        <div className="field-group">
          <label htmlFor="register-password">Password</label>
          <input
            id="register-password"
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder="Create a password"
            value={form.password}
            onChange={handleChange}
            required
            minLength={6}
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
          {submitting ? "Creating..." : "Create Account"}
        </button>
      </form>

      <p className="auth-alt">
        Already have an account?{" "}
        {onSwitch ? (
          <button
            type="button"
            className="auth-switch-btn"
            onClick={onSwitch}
          >
            Sign in
          </button>
        ) : (
          <Link to="/login">Sign in</Link>
        )}
      </p>
    </div>
  );
};

export default Register;
