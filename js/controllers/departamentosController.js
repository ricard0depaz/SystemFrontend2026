import { requireAuth } from "../guards/authGuard.js";
import { can, PERMISSIONS } from "../services/authService.js";
import {
  addDepartment,
  deleteDepartment,
  getDepartments,
  updateDepartment
} from "../services/departamentosService.js";

const session = requireAuth(PERMISSIONS.DEPARTMENTS_READ);
const grid = document.querySelector("#departmentGrid");
const emptyState = document.querySelector("#departmentEmpty");
const summary = document.querySelector("#departmentSummary");
const search = document.querySelector("#departmentSearch");
const modal = document.querySelector("#departmentModal");
const form = document.querySelector("#departmentForm");
let departments = [];

if (session) {
  await initializeView();
}

async function initializeView() {
  // Prepara los controles y muestra esqueletos mientras llega la API.
  setupEvents();
  showLoadingCards();
  await loadDepartments();
}

function setupEvents() {
  document.querySelector("#newDepartmentButton")?.addEventListener("click", () => openModal());
  document.querySelectorAll("[data-close-modal]").forEach((button) => button.addEventListener("click", () => modal.close()));
  form.addEventListener("submit", saveDepartment);
  search.addEventListener("input", renderDepartments);
  grid.addEventListener("click", handleCardAction);
}

async function loadDepartments() {
  try {
    // Espera el listado completo antes de construir las tarjetas.
    departments = (await getDepartments()) || [];
    renderDepartments();
  } catch (error) {
    if (error.status === 401 || error.status === 403) return;
    departments = [];
    renderDepartments();
    showToast(error.message, "error");
  }
}

function renderDepartments() {
  // Filtra localmente sin realizar una petición nueva por cada tecla escrita.
  const term = search.value.trim().toLocaleLowerCase("es");
  const filtered = departments.filter((department) =>
    [department.nombreDepto, department.abreviatura, department.ubicacion]
      .some((value) => String(value || "").toLocaleLowerCase("es").includes(term))
  );

  grid.replaceChildren(...filtered.map(departmentCard));
  emptyState.hidden = filtered.length > 0;
  summary.textContent = `${filtered.length} ${filtered.length === 1 ? "área registrada" : "áreas registradas"}`;
}

function departmentCard(department, index) {
  // Se crean nodos DOM y se usa textContent para no insertar HTML de la API.
  const card = document.createElement("article");
  card.className = "department-card";
  const head = document.createElement("div");
  head.className = "department-card-head";
  const icon = document.createElement("span");
  icon.className = `department-icon color-${(index % 4) + 1}`;
  icon.textContent = (department.abreviatura || department.nombreDepto || "D").slice(0, 2).toUpperCase();
  const tag = document.createElement("span");
  tag.className = "department-tag";
  tag.textContent = department.abreviatura || "ÁREA";
  head.append(icon, tag);

  const title = document.createElement("h3");
  title.textContent = department.nombreDepto || "Sin nombre";
  const location = document.createElement("p");
  location.className = "department-location";
  location.textContent = `⌖ ${department.ubicacion || "Ubicación no especificada"}`;
  const actions = document.createElement("div");
  actions.className = "card-actions";

  if (can(PERMISSIONS.DEPARTMENTS_EDIT, session)) {
    actions.append(actionButton("Editar", "edit", department.id));
  }
  if (can(PERMISSIONS.DEPARTMENTS_DELETE, session)) {
    actions.append(actionButton("Eliminar", "delete", department.id, true));
  }
  card.append(head, title, location);
  if (actions.childElementCount) card.append(actions);
  return card;
}

function actionButton(label, action, id, danger = false) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = danger ? "text-button danger-action" : "text-button";
  button.dataset.action = action;
  button.dataset.id = id;
  button.textContent = label;
  return button;
}

function openModal(department = null) {
  // El mismo formulario sirve para crear o editar según exista un departamento.
  form.reset();
  form.id.value = department?.id || "";
  form.nombreDepto.value = department?.nombreDepto || "";
  form.abreviatura.value = department?.abreviatura || "";
  form.ubicacion.value = department?.ubicacion || "";
  const editing = Boolean(department);
  document.querySelector("#departmentModalEyebrow").textContent = editing ? "Actualizar registro" : "Nuevo registro";
  document.querySelector("#departmentModalTitle").textContent = editing ? "Editar departamento" : "Agregar departamento";
  document.querySelector("#saveDepartmentButton").textContent = editing ? "Guardar cambios" : "Guardar departamento";
  modal.showModal();
}

async function saveDepartment(event) {
  event.preventDefault();
  if (!form.reportValidity()) return;
  const button = document.querySelector("#saveDepartmentButton");
  const id = form.id.value;
  const department = {
    nombreDepto: form.nombreDepto.value.trim(),
    abreviatura: form.abreviatura.value.trim(),
    ubicacion: form.ubicacion.value.trim()
  };
  button.disabled = true;
  try {
    // Espera el endpoint apropiado: PUT al editar y POST al crear.
    if (id) await updateDepartment(id, department);
    else await addDepartment(department);
    modal.close();
    showToast(id ? "Departamento actualizado." : "Departamento creado.", "success");
    await loadDepartments();
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    button.disabled = false;
  }
}

async function handleCardAction(event) {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const department = departments.find((item) => String(item.id) === button.dataset.id);
  if (!department) return;

  if (button.dataset.action === "edit") {
    openModal(department);
    return;
  }
  if (!window.confirm(`¿Eliminar el departamento ${department.nombreDepto}?`)) return;
  button.disabled = true;
  try {
    // La cuadrícula se recarga solamente cuando DELETE termina correctamente.
    await deleteDepartment(department.id);
    showToast("Departamento eliminado.", "success");
    await loadDepartments();
  } catch (error) {
    showToast(error.message, "error");
    button.disabled = false;
  }
}

function showLoadingCards() {
  grid.innerHTML = Array.from({ length: 4 }, () => '<article class="department-card skeleton-card"><span></span><span></span><span></span></article>').join("");
}

function showToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.querySelector("#toastContainer").append(toast);
  window.setTimeout(() => toast.remove(), 4000);
}
