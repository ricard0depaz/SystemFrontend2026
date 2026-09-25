import { handleUnauthorized } from "./authService.js";

// URL del controlador de empleados en la API de Spring Boot.
const API_URL = "http://localhost:8080/api/empleados";

// Función para obtener todos los empleados.
export async function getEmployees() {
  try {
    const response = await fetch(API_URL, {
      method: "GET",
      credentials: "include"
    });

    if (response.status === 401 || response.status === 403) {
      handleUnauthorized(response.status);
    }

    if (!response.ok) {
      const error = new Error("Error al obtener empleados: " + response.statusText);
      error.status = response.status;
      throw error;
    }

    const result = await response.json();

    if (result.success === false) {
      throw new Error(result.message || "La API no pudo obtener los empleados.");
    }

    return result.data; // Enviamos el listado al controller.
  } catch (error) {
    console.error("Error al obtener empleados:", error);
    throw error; // Propagamos el error al try/catch del controller.
  }
}

// Función para obtener un empleado específico por su ID.
export async function getEmployee(id) {
  try {
    const response = await fetch(`${API_URL}/${encodeURIComponent(id)}`, {
      method: "GET",
      credentials: "include"
    });

    if (response.status === 401 || response.status === 403) {
      handleUnauthorized(response.status);
    }

    if (!response.ok) {
      const error = new Error("Error al obtener el empleado: " + response.statusText);
      error.status = response.status;
      throw error;
    }

    const result = await response.json();
    return result.data; // Retornamos el empleado al controller.
  } catch (error) {
    console.error("Error al obtener el empleado:", error);
    throw error;
  }
}

// Función para agregar un empleado.
export async function addEmployee(employee) {
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      credentials: "include",
      body: JSON.stringify(employee)
    });

    if (response.status === 401 || response.status === 403) {
      handleUnauthorized(response.status);
    }

    const result = await response.json();

    if (!response.ok || result.success === false) {
      const error = new Error(result.message || "Error al agregar el empleado: " + response.statusText);
      error.status = response.status;
      throw error;
    }

    return result.data; // Retornamos el nuevo empleado al controller.
  } catch (error) {
    console.error("Error al agregar el empleado:", error);
    throw error;
  }
}

// Función para eliminar un empleado.
export async function deleteEmployee(id) {
  try {
    const response = await fetch(`${API_URL}/${encodeURIComponent(id)}`, {
      method: "DELETE",
      credentials: "include"
    });

    if (response.status === 401 || response.status === 403) {
      handleUnauthorized(response.status);
    }

    if (!response.ok) {
      const error = new Error("Error al eliminar el empleado: " + response.statusText);
      error.status = response.status;
      throw error;
    }

    return true; // HTTP 204 no contiene JSON, pero confirma que se eliminó.
  } catch (error) {
    console.error("Error al eliminar el empleado:", error);
    throw error;
  }
}
