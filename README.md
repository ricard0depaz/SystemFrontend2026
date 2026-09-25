# Nexora — frontend vanilla

Frontend sin framework para la API de [`practicaSpringBoot`](https://github.com/devjosueguinea/practicaSpringBoot).

## Estructura

Todas las vistas están en la raíz:

```text
├── index.html
├── login.html
├── empleados.html
├── departamentos.html
├── css/
│   └── styles.css
└── js/
    ├── controllers/
    │   ├── indexController.js
    │   ├── loginController.js
    │   ├── empleadosController.js
    │   └── departamentosController.js
    ├── guards/
    │   └── authGuard.js
    └── services/
        ├── authService.js
        ├── empleadosService.js
        └── departamentosService.js
```

No existe `config.js` ni un módulo común. Cada servicio contiene la URL del controlador de API que consume. Actualmente apunta a `http://localhost:8080`; si el backend usa otro host o puerto hay que cambiar las constantes `AUTH_URL`, `EMPLOYEES_URL` y `DEPARTMENTS_URL` en sus servicios respectivos.

## Ejecución

1. Iniciar la API Spring Boot en el puerto `8080` con sus variables de entorno.
2. Servir este directorio por HTTP. Por ejemplo:

   ```bash
   npx serve .
   ```

3. Abrir la URL indicada por el servidor. No abrir los HTML con `file://`, porque los módulos ES necesitan un servidor HTTP.

Todas las solicitudes usan `credentials: "include"` para enviar la cookie HTTP-only creada por el backend.

## Código asíncrono

Los servicios y controladores usan funciones `async` y esperan las operaciones de red con `await`. No se utilizan cadenas `.then()`, `.catch()` ni llamadas directas a `Promise.*`. Los bloques `try/catch` permanecen para controlar errores dentro del flujo `async/await` y mostrar mensajes útiles sin detener la aplicación.

Cada servicio sigue una estructura directa: declara su propia constante `API_URL` y exporta funciones independientes como `getEmployees()`, `addEmployee()`, `getDepartments()` o `updateDepartment()`. Cada función contiene su propio `fetch`, validación de `response.ok`, conversión mediante `await response.json()` y bloque `try/catch`.

## Roles y permisos de interfaz

El login de la API devuelve `data.rol`. `authService.js` transforma ese valor en permisos de interfaz:

- `ADMIN` / `ADMINISTRADOR`: acceso completo.
- `RRHH` / `RECURSOS HUMANOS`: gestiona empleados y crea/edita departamentos.
- `GERENTE`, `SUPERVISOR`, `AUDITOR`, `CONSULTA`, `USUARIO` / `USER`: consulta empleados y departamentos.
- `EMPLEADO`: solo panel principal.
- Rol no reconocido: solo panel principal.

El guard bloquea vistas no permitidas y los elementos con `data-permission` se ocultan según esta matriz.

Las vistas comienzan con la clase `auth-pending`, por lo que permanecen ocultas hasta que el guard valida la sesión. Los eventos `pagehide` y `pageshow` vuelven a ocultar y validar las páginas restauradas desde la caché del navegador; así no se muestra el panel antes de redirigir ni se puede regresar a él con el botón Atrás después de cerrar sesión.

> Ocultar opciones en el frontend no reemplaza autorización del servidor. La API revisada solo exige que el usuario esté autenticado; no usa `hasRole` o `hasAuthority` en sus endpoints.

## Observaciones de integración

- La ruta `POST /api/auth/logout` aparece en `SecurityConfig`, pero no existe un método `@PostMapping("/logout")`; por eso el frontend elimina su estado local, pero el backend todavía debe invalidar la cookie.
- No existe un endpoint `/me` o `/session` para revalidar y reconstruir la sesión. El frontend conserva únicamente `id`, `username`, `rol` y permisos en `localStorage`; el JWT sigue en una cookie HTTP-only.
- El backend debe permitir mediante CORS el origen del frontend, habilitar credenciales y definir un `CorsConfigurationSource`. La versión revisada lo inyecta en `SecurityConfig`, pero no incluye su implementación en el repositorio.
- La paginación del backend usa `PageRequest.of(page, size)` aunque el parámetro por defecto es `page=1`, lo que omite la primera página. La vista usa por ahora `GET /api/empleados` y pagina localmente.
