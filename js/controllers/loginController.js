import { login } from "../services/authService.js";
import { redirectIfAuthenticated } from "../guards/authGuard.js";

const form = document.querySelector("#loginForm");
const alert = document.querySelector("#loginAlert");
const submitButton = document.querySelector("#loginButton");
const passwordInput = document.querySelector("#password");

if (!redirectIfAuthenticated()) {
  // Solo prepara el formulario cuando todavía no existe una sesión local.
  showReasonMessage();
  setupPasswordToggle();
  form.addEventListener("submit", handleLogin);
}

function showReasonMessage() {
  const reason = new URLSearchParams(window.location.search).get("reason");
  const messages = {
    required: "Inicia sesión para acceder al panel.",
    expired: "Tu sesión expiró. Vuelve a ingresar.",
    logout: "La sesión se cerró correctamente."
  };

  if (messages[reason]) {
    alert.textContent = messages[reason];
    alert.classList.toggle("alert-success", reason === "logout");
    alert.hidden = false;
  }
}

function setupPasswordToggle() {
  document.querySelector("#passwordToggle").addEventListener("click", (event) => {
    const showPassword = passwordInput.type === "password";
    passwordInput.type = showPassword ? "text" : "password";
    event.currentTarget.textContent = showPassword ? "Ocultar" : "Ver";
    event.currentTarget.setAttribute("aria-label", showPassword ? "Ocultar contraseña" : "Mostrar contraseña");
  });
}

function validateForm() {
  // La validación local evita enviar credenciales vacías a Spring Boot.
  const username = form.username.value.trim();
  const password = form.password.value;
  const errors = {
    username: username ? "" : "Escribe tu nombre de usuario.",
    password: password.trim() ? "" : "Escribe tu contraseña."
  };

  Object.entries(errors).forEach(([field, message]) => {
    form.elements[field].classList.toggle("is-invalid", Boolean(message));
    document.querySelector(`[data-error-for="${field}"]`).textContent = message;
  });
  return { valid: !errors.username && !errors.password, username, password };
}

async function handleLogin(event) {
  event.preventDefault();
  alert.hidden = true;
  const values = validateForm();
  if (!values.valid) return;

  setLoading(true);
  try {
    // Espera el login antes de redirigir; así la sesión y la cookie ya existen.
    await login({ username: values.username, password: values.password });
    window.location.replace(new URL("../../index.html", import.meta.url).href);
  } catch (error) {
    alert.textContent = error.message;
    alert.classList.remove("alert-success");
    alert.hidden = false;
  } finally {
    setLoading(false);
  }
}

function setLoading(loading) {
  submitButton.disabled = loading;
  submitButton.classList.toggle("is-loading", loading);
  submitButton.querySelector("span").textContent = loading ? "Verificando…" : "Entrar al panel";
}
