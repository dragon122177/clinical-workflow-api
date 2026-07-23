# Cómo explicar CareFlow en una entrevista

## Explicación corta

> CareFlow es una plataforma full-stack de demostración para coordinar operaciones clínicas. Construí una API en Node.js y TypeScript con autenticación, permisos por rol, PostgreSQL, validación y auditoría. El frontend está hecho con React y permite administrar pacientes ficticios, citas y casos mediante flujos claros. También añadí control de concurrencia, pruebas automatizadas, Docker y CI.

## Qué problema resuelve

Centraliza información operativa que normalmente estaría dividida entre agendas, listas y registros: pacientes, citas, responsables, estados de casos y acciones sensibles.

## Decisiones importantes

- La autorización se comprueba en el backend; ocultar botones no es seguridad.
- Las consultas SQL usan parámetros para reducir riesgos de inyección.
- Los registros y casos tienen versiones para detectar ediciones simultáneas y evitar que un usuario sobrescriba silenciosamente el trabajo de otro.
- Las acciones sensibles generan eventos de auditoría.
- El proyecto usa datos ficticios y declara claramente que no es un producto médico certificado.

## Si preguntan qué mejorarías para producción

Añadiría migraciones versionadas, MFA, rotación de tokens, rate limiting, administración de secretos, cifrado respaldado por KMS, copias de seguridad, observabilidad, paginación, pruebas end-to-end y una evaluación formal de cumplimiento normativo.

## Frase en inglés

> I built CareFlow as a production-shaped full-stack portfolio project. It combines a React interface with a TypeScript and Express API, PostgreSQL data modelling, role-based authorization, audit logging, optimistic concurrency, automated tests, Docker, and CI. I used fictional data and kept compliance claims deliberately out of scope.
