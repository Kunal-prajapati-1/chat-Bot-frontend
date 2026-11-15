
import React, { useEffect } from "react";
import Login from "../../pages/Login.jsx";
import Register from "../../pages/Register.jsx";
import "./AuthModal.css";

const AuthModal = ({ mode, onClose, onSwitch, onSuccess }) => {
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  if (!mode) return null;

  return (
    <div
      className="auth-modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="auth-modal"
        role="dialog"
        aria-modal="true"
        aria-label={mode === "login" ? "Sign in" : "Create account"}
      >
        <button
          type="button"
          className="auth-modal-close"
          onClick={onClose}
          aria-label="Close authentication modal"
        >
          &times;
        </button>

        {mode === "login" ? (
          <Login onSuccess={onSuccess} onSwitch={() => onSwitch("signup")} />
        ) : (
          <Register
            onSuccess={onSuccess}
            onSwitch={() => onSwitch("login")}
          />
        )}
      </div>
    </div>
  );
};

export default AuthModal;
