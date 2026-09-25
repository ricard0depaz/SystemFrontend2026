import { requireAuth } from "../guards/authGuard.js";
import { can, PERMISSIONS } from "../services/authService.js";
import { getEmployees } from "../services/empleadosService.js";
import { getDepartments } from "../services/departamentosService.js";

const session = requireAuth(PERMISSIONS.DASHBOARD);

if (session) {
  // Primero construye la interfaz y después espera los datos del dashboard.
  renderPermissionList();
  await loadDashboard();
}

function renderPermissionList() {
  // Traduce los identificadores internos a textos comprensibles para el usuario.
  const labels = {
    [PERMISSIONS.DASHBOARD]: "Acceso al panel principal",
    [PERMISSIONS.EMPLOYEES_READ]: "Consultar empleados",
    [PERMISSIONS.EMPLOYEES_CREATE]: "Registrar empleados",
    [PERMISSIONS.EMPLOYEES_DELETE]: "Eliminar empleados",
    [PERMISSIONS.DEPARTMENTS_READ]: "Consultar departamentos",
    [PERMISSIONS.DEPARTMENTS_CREATE]: "Crear departamentos",
    [PERMISSIONS.DEPARTMENTS_EDIT]: "Editar departamentos",
    [PERMISSIONS.DEPARTMENTS_DELETE]: "Eliminar departamentos"
  };
  const list = document.querySelector("#permissionList");
  session.permissions.forEach((permission) => {
    const item = document.createElement("li");
    item.innerHTML = `<span aria-hidden="true">✓</span><p>${labels[permission] || permission}</p>`;
    list.append(item);
  });
}

async function loadDashboard() {
  // Cada bloque se consulta únicamente cuando el rol puede verlo. Las cargas
  // se esperan de forma explícita con await y se controlan con try/catch.
  if (can(PERMISSIONS.EMPLOYEES_READ, session)) {
    await loadCount(getEmployees, "#employeeCount", "empleados");
  }
  if (can(PERMISSIONS.DEPARTMENTS_READ, session)) {
    await loadCount(getDepartments, "#departmentCount", "departamentos");
  }
}

async function loadCount(serviceMethod, selector, label) {
  try {
    // Ejecuta y espera el método del servicio recibido como argumento.
    const records = await serviceMethod();
    document.querySelector(selector).textContent = Array.isArray(records) ? records.length : 0;
  } catch (error) {
    if (error.status === 401 || error.status === 403) return;
    document.querySelector(selector).textContent = "!";
    showToast(`No se pudo cargar el total de ${label}.`, "error");
  }
}

function showToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.querySelector("#toastContainer").append(toast);
  window.setTimeout(() => toast.remove(), 4000);
}
