import { handleUnauthorized } from "./authService.js";

// URL del controlador de departamentos en la API de Spring Boot.
const API_URL = "https://systemrh-5d827726e203.herokuapp.com/api/departamentos";

// Función para obtener todos los departamentos.
export async function getDepartments() {
  try {
    const response = await fetch(API_URL, {
      method: "GET",
      credentials: "include"
    });

    if (response.status === 401 || response.status === 403) {
      handleUnauthorized(response.status);
    }

    if (!response.ok) {
      const error = new Error("Error al obtener departamentos: " + response.statusText);
      error.status = response.status;
      throw error;
    }

    const result = await response.json();

    if (result.success === false) {
      throw new Error(result.message || "La API no pudo obtener los departamentos.");
    }

    return result.data; // Enviamos el listado al controller.
  } catch (error) {
    console.error("Error al obtener departamentos:", error);
    throw error;
  }
}

// Función para obtener un departamento específico por su ID.
export async function getDepartment(id) {
  try {
    const response = await fetch(`${API_URL}/${encodeURIComponent(id)}`, {
      method: "GET",
      credentials: "include"
    });

    if (response.status === 401 || response.status === 403) {
      handleUnauthorized(response.status);
    }

    if (!response.ok) {
      const error = new Error("Error al obtener el departamento: " + response.statusText);
      error.status = response.status;
      throw error;
    }

    const result = await response.json();
    return result.data; // Retornamos el departamento al controller.
  } catch (error) {
    console.error("Error al obtener el departamento:", error);
    throw error;
  }
}

// Función para agregar un departamento.
export async function addDepartment(department) {
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      credentials: "include",
      body: JSON.stringify(department)
    });

    if (response.status === 401 || response.status === 403) {
      handleUnauthorized(response.status);
    }

    const result = await response.json();

    if (!response.ok || result.success === false) {
      const error = new Error(result.message || "Error al agregar el departamento: " + response.statusText);
      error.status = response.status;
      throw error;
    }

    return result.data; // Retornamos el nuevo departamento al controller.
  } catch (error) {
    console.error("Error al agregar el departamento:", error);
    throw error;
  }
}

// Función para actualizar un departamento.
export async function updateDepartment(id, department) {
  try {
    const response = await fetch(`${API_URL}/${encodeURIComponent(id)}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      credentials: "include",
      body: JSON.stringify(department)
    });

    if (response.status === 401 || response.status === 403) {
      handleUnauthorized(response.status);
    }

    const result = await response.json();

    if (!response.ok || result.success === false) {
      const error = new Error(result.message || "Error al actualizar el departamento: " + response.statusText);
      error.status = response.status;
      throw error;
    }

    return result.data; // Retornamos el departamento actualizado al controller.
  } catch (error) {
    console.error("Error al actualizar el departamento:", error);
    throw error;
  }
}

// Función para eliminar un departamento.
export async function deleteDepartment(id) {
  try {
    const response = await fetch(`${API_URL}/${encodeURIComponent(id)}`, {
      method: "DELETE",
      credentials: "include"
    });

    if (response.status === 401 || response.status === 403) {
      handleUnauthorized(response.status);
    }

    if (!response.ok) {
      const error = new Error("Error al eliminar el departamento: " + response.statusText);
      error.status = response.status;
      throw error;
    }

    return true; // HTTP 204 confirma la eliminación y no necesita response.json().
  } catch (error) {
    console.error("Error al eliminar el departamento:", error);
    throw error;
  }
}
