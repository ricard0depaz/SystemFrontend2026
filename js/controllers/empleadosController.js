import { requireAuth } from "../guards/authGuard.js";
import { can, PERMISSIONS } from "../services/authService.js";
import { addEmployee, deleteEmployee, getEmployees } from "../services/empleadosService.js";
import { getDepartments } from "../services/departamentosService.js";

const session = requireAuth(PERMISSIONS.EMPLOYEES_READ);
const tableBody = document.querySelector("#employeeTableBody");
const emptyState = document.querySelector("#employeeEmpty");
const summary = document.querySelector("#employeeSummary");
const search = document.querySelector("#employeeSearch");
const pagination = document.querySelector("#employeePagination");
const modal = document.querySelector("#employeeModal");
const form = document.querySelector("#employeeForm");
const PAGE_SIZE = 7;

let employees = [];
let currentPage = 1;

if (session) {
  await initializeView();
}

async function initializeView() {
  // Registra los eventos antes de solicitar los datos para que la vista responda de inmediato.
  setupEvents();
  showLoadingRows();

  // Espera la respuesta de la API antes de terminar la inicialización.
  await loadEmployees();

  // Permite abrir el formulario desde el acceso rápido del dashboard.
  const openNewForm = new URLSearchParams(window.location.search).get("nuevo") === "true";
  if (openNewForm && can(PERMISSIONS.EMPLOYEES_CREATE, session)) {
    await openModal();
  }
}

function setupEvents() {
  document.querySelector("#newEmployeeButton")?.addEventListener("click", async () => {
    await openModal();
  });
  document.querySelectorAll("[data-close-modal]").forEach((button) => button.addEventListener("click", () => modal.close()));
  form.addEventListener("submit", createEmployee);
  search.addEventListener("input", () => {
    currentPage = 1;
    renderEmployees();
  });
  tableBody.addEventListener("click", handleTableAction);
  pagination.addEventListener("click", (event) => {
    const page = Number(event.target.closest("button")?.dataset.page);
    if (!page) return;
    currentPage = page;
    renderEmployees();
  });

}

async function loadEmployees() {
  try {
    // Espera el listado completo y solo después actualiza la tabla.
    employees = (await getEmployees()) || [];
    renderEmployees();
  } catch (error) {
    if (error.status === 401 || error.status === 403) return;
    employees = [];
    renderEmployees();
    showToast(error.message, "error");
  }
}

function filteredEmployees() {
  // La búsqueda se realiza localmente sobre los datos ya obtenidos de la API.
  const term = search.value.trim().toLocaleLowerCase("es");
  if (!term) return employees;
  return employees.filter((employee) =>
    [employee.nombre, employee.apellido, employee.email, employee.nombreDepartamento]
      .some((value) => String(value || "").toLocaleLowerCase("es").includes(term))
  );
}

function renderEmployees() {
  // Calcula la página visible después de aplicar el filtro de búsqueda.
  const filtered = filteredEmployees();
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  currentPage = Math.min(currentPage, totalPages);
  const pageRecords = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  tableBody.replaceChildren(...pageRecords.map(employeeRow));
  emptyState.hidden = pageRecords.length > 0;
  summary.textContent = `${filtered.length} ${filtered.length === 1 ? "persona registrada" : "personas registradas"}`;
  renderPagination(totalPages);
}

function employeeRow(employee) {
  const row = document.createElement("tr");
  const employeeCell = document.createElement("td");
  const person = document.createElement("div");
  person.className = "person-cell";
  const avatar = document.createElement("span");
  avatar.className = "table-avatar";
  avatar.textContent = `${employee.nombre?.[0] || ""}${employee.apellido?.[0] || ""}`.toUpperCase();
  const identity = document.createElement("span");
  const name = document.createElement("strong");
  name.textContent = `${employee.nombre || ""} ${employee.apellido || ""}`.trim() || "Sin nombre";
  const email = document.createElement("small");
  email.textContent = employee.email || "Sin correo";
  identity.append(name, email);
  person.append(avatar, identity);
  employeeCell.append(person);

  row.append(
    employeeCell,
    textCell(employee.nombreDepartamento || "Sin departamento"),
    textCell(formatDate(employee.fecha_ingreso)),
    textCell(formatCurrency(employee.salario))
  );

  const actionCell = document.createElement("td");
  actionCell.className = "actions-column";
  if (can(PERMISSIONS.EMPLOYEES_DELETE, session)) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "table-action danger-action";
    button.dataset.action = "delete";
    button.dataset.id = employee.id;
    button.dataset.name = name.textContent;
    button.textContent = "Eliminar";
    actionCell.append(button);
  } else {
    actionCell.textContent = "—";
  }
  row.append(actionCell);
  return row;
}

function textCell(value) {
  const cell = document.createElement("td");
  cell.textContent = value;
  return cell;
}

function renderPagination(totalPages) {
  pagination.replaceChildren();
  if (totalPages <= 1) return;
  for (let page = 1; page <= totalPages; page += 1) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.page = page;
    button.textContent = page;
    button.classList.toggle("active", page === currentPage);
    button.setAttribute("aria-label", `Ir a la página ${page}`);
    pagination.append(button);
  }
}

async function openModal() {
  form.reset();
  const select = form.idDepartamento;
  select.innerHTML = '<option value="">Selecciona un departamento</option>';
  try {
    // El selector se llena con departamentos válidos obtenidos del backend.
    const departments = (await getDepartments()) || [];
    departments.forEach((department) => {
      const option = document.createElement("option");
      option.value = department.id;
      option.textContent = department.nombreDepto;
      select.append(option);
    });
    modal.showModal();
  } catch (error) {
    showToast(error.message, "error");
  }
}

async function createEmployee(event) {
  event.preventDefault();
  if (!form.reportValidity()) return;
  const button = document.querySelector("#saveEmployeeButton");
  button.disabled = true;
  try {
    // Convierte FormData al DTO exacto que espera EmpleadosController.
    const fields = new FormData(form);
    await addEmployee({
      nombre: fields.get("nombre").trim(),
      apellido: fields.get("apellido").trim(),
      email: fields.get("email").trim(),
      fecha_ingreso: fields.get("fecha_ingreso"),
      salario: Number(fields.get("salario")),
      idDepartamento: Number(fields.get("idDepartamento"))
    });
    // La interfaz se actualiza únicamente después de confirmar la creación.
    modal.close();
    showToast("Empleado registrado correctamente.", "success");
    await loadEmployees();
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    button.disabled = false;
  }
}

async function handleTableAction(event) {
  const button = event.target.closest('[data-action="delete"]');
  if (!button) return;
  if (!window.confirm(`¿Eliminar a ${button.dataset.name}? Esta acción no se puede deshacer.`)) return;
  button.disabled = true;
  try {
    // Espera la eliminación antes de volver a consultar la tabla.
    await deleteEmployee(button.dataset.id);
    showToast("Empleado eliminado.", "success");
    await loadEmployees();
  } catch (error) {
    showToast(error.message, "error");
    button.disabled = false;
  }
}

function showLoadingRows() {
  tableBody.innerHTML = Array.from({ length: 5 }, () => '<tr class="skeleton-row"><td colspan="5"><span></span></td></tr>').join("");
}

function formatDate(date) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("es-SV", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
}

function formatCurrency(amount) {
  return new Intl.NumberFormat("es-SV", { style: "currency", currency: "USD" }).format(Number(amount || 0));
}

function showToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.querySelector("#toastContainer").append(toast);
  window.setTimeout(() => toast.remove(), 4000);
}
