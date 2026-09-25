import { can, getSession, logout } from "../services/authService.js";

const LOGIN_URL = new URL("../../login.html", import.meta.url);
const HOME_URL = new URL("../../index.html", import.meta.url);

function goToLogin(reason) {
  // Conserva el motivo para que login.html muestre un mensaje apropiado.
  const url = new URL(LOGIN_URL);
  if (reason) url.searchParams.set("reason", reason);
  window.location.replace(url.href);
}

function paintSession(session) {
  // Completa todos los componentes de usuario presentes en la vista actual.
  document.querySelectorAll("[data-username]").forEach((element) => {
    element.textContent = session.username;
  });
  document.querySelectorAll("[data-role]").forEach((element) => {
    element.textContent = session.role;
  });
  document.querySelectorAll("[data-user-initial]").forEach((element) => {
    element.textContent = session.username.charAt(0).toUpperCase();
  });
  document.querySelectorAll("[data-first-name]").forEach((element) => {
    element.textContent = session.username.split(/[._\s-]/)[0];
  });
}

function applyPermissionVisibility(session) {
  // Cada elemento declara su permiso con data-permission. Si el rol no lo
  // posee, el elemento se retira tanto visualmente como del árbol accesible.
  document.querySelectorAll("[data-permission]").forEach((element) => {
    const allowed = can(element.dataset.permission, session);
    element.hidden = !allowed;
    element.setAttribute("aria-hidden", String(!allowed));
  });
}

function setupShell() {
  // Controla el menú lateral en pantallas pequeñas.
  const sidebar = document.querySelector("#sidebar");
  document.querySelector("#menuButton")?.addEventListener("click", () => {
    sidebar?.classList.toggle("is-open");
  });

  document.querySelectorAll("[data-logout]").forEach((button) => {
    button.addEventListener("click", async () => {
      button.disabled = true;
      try {
        // Espera el intento de logout antes de abandonar la vista actual.
        await logout();
      } catch {
        // El backend aún no implementa logout; authService ya limpió localStorage.
      } finally {
        goToLogin("logout");
      }
    });
  });

  window.addEventListener("workly:session-expired", () => goToLogin("expired"), { once: true });
}

export function requireAuth(requiredPermission = "dashboard") {
  // Primera barrera: debe existir una sesión creada por el login.
  const session = getSession();
  if (!session) {
    goToLogin("required");
    return null;
  }

  // Segunda barrera: el rol debe poseer el permiso exigido por la vista.
  if (!can(requiredPermission, session)) {
    window.location.replace(HOME_URL.href);
    return null;
  }

  // La vista solo se inicializa después de superar ambas verificaciones.
  paintSession(session);
  applyPermissionVisibility(session);
  setupShell();
  return session;
}

export function redirectIfAuthenticated() {
  if (getSession()) {
    window.location.replace(HOME_URL.href);
    return true;
  }
  return false;
}
