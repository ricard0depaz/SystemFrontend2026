// URL del controlador de autenticación en la API de Spring Boot.
const API_URL = "https://systemrh-5d827726e203.herokuapp.com/api/auth";
const SESSION_KEY = "nexora.session";

// Nombres únicos usados por las vistas para mostrar u ocultar cada función.
export const PERMISSIONS = Object.freeze({
  DASHBOARD: "dashboard",
  EMPLOYEES_READ: "empleados:ver",
  EMPLOYEES_CREATE: "empleados:crear",
  EMPLOYEES_DELETE: "empleados:eliminar",
  DEPARTMENTS_READ: "departamentos:ver",
  DEPARTMENTS_CREATE: "departamentos:crear",
  DEPARTMENTS_EDIT: "departamentos:editar",
  DEPARTMENTS_DELETE: "departamentos:eliminar"
});

const READ_ACCESS = [
  PERMISSIONS.DASHBOARD,
  PERMISSIONS.EMPLOYEES_READ,
  PERMISSIONS.DEPARTMENTS_READ
];

// El rol llega en data.rol desde POST /api/auth/login.
const ROLE_PERMISSIONS = Object.freeze({
  ADMIN: Object.values(PERMISSIONS),
  ADMINISTRADOR: Object.values(PERMISSIONS),
  RRHH: [
    ...READ_ACCESS,
    PERMISSIONS.EMPLOYEES_CREATE,
    PERMISSIONS.EMPLOYEES_DELETE,
    PERMISSIONS.DEPARTMENTS_CREATE,
    PERMISSIONS.DEPARTMENTS_EDIT
  ],
  RECURSOS_HUMANOS: [
    ...READ_ACCESS,
    PERMISSIONS.EMPLOYEES_CREATE,
    PERMISSIONS.EMPLOYEES_DELETE,
    PERMISSIONS.DEPARTMENTS_CREATE,
    PERMISSIONS.DEPARTMENTS_EDIT
  ],
  GERENTE: READ_ACCESS,
  SUPERVISOR: READ_ACCESS,
  AUDITOR: READ_ACCESS,
  CONSULTA: READ_ACCESS,
  USUARIO: READ_ACCESS,
  USER: READ_ACCESS,
  EMPLEADO: [PERMISSIONS.DASHBOARD]
});

// Normaliza el texto para comparar roles aunque contengan espacios o acentos.
function normalizeRole(role = "") {
  return role
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase()
    .replace(/^(ROLE_)+/, "")
    .replace(/[\s-]+/g, "_");
}

// Función para iniciar sesión.
export async function login(credentials) {
  try {
    const response = await fetch(`${API_URL}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      credentials: "include",
      body: JSON.stringify(credentials)
    });

    const result = await response.json();

    if (!response.ok || result.success === false) {
      const error = new Error(result.message || result.error || "Error al iniciar sesión.");
      error.status = response.status;
      throw error;
    }

    if (!result.data?.username || !result.data?.rol) {
      throw new Error("La API no devolvió los datos de sesión esperados.");
    }

    // El JWT no se almacena aquí: permanece dentro de la cookie HTTP-only.
    const session = {
      id: result.data.id,
      username: result.data.username,
      role: result.data.rol,
      permissions: permissionsFor(result.data.rol)
    };

    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session; // Retornamos la sesión al loginController.
  } catch (error) {
    console.error("Error al iniciar sesión:", error);
    throw error;
  }
}

// Función para cerrar sesión.
export async function logout() {
  try {
    const response = await fetch(`${API_URL}/logout`, {
      method: "POST",
      credentials: "include"
    });

    if (!response.ok) {
      const error = new Error("Error al cerrar la sesión: " + response.statusText);
      error.status = response.status;
      throw error;
    }

    return true;
  } catch (error) {
    console.error("Error al cerrar sesión:", error);
    throw error;
  } finally {
    // El backend aún no implementa logout; la sesión local siempre debe limpiarse.
    clearSession();
  }
}

// Recupera la información de sesión guardada después del login.
export function getSession() {
  try {
    const session = JSON.parse(localStorage.getItem(SESSION_KEY));

    if (!session?.username || !session?.role) {
      return null;
    }

    // Los permisos se recalculan para no confiar en valores alterados manualmente.
    return {
      ...session,
      permissions: permissionsFor(session.role)
    };
  } catch (error) {
    console.error("Error al recuperar la sesión:", error);
    clearSession();
    return null;
  }
}

// Elimina la sesión visible para el frontend.
export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

// Obtiene los permisos asociados al rol devuelto por la API.
export function permissionsFor(role) {
  return [...(ROLE_PERMISSIONS[normalizeRole(role)] || [PERMISSIONS.DASHBOARD])];
}

// Comprueba si la sesión actual posee un permiso concreto.
export function can(permission, session = getSession()) {
  return Boolean(session?.permissions?.includes(permission));
}

// Informa al auth guard cuando cualquier endpoint rechaza el JWT.
export function handleUnauthorized(status) {
  if (status !== 401 && status !== 403) {
    return;
  }

  clearSession();
  window.dispatchEvent(new CustomEvent("nexora:session-expired"));
}
