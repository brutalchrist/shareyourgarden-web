# Frontend

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 9.1.1.

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The app will automatically reload if you change any of the source files.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory. Use the `--prod` flag for a production build.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via [Protractor](http://www.protractortest.org/).

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI README](https://github.com/angular/angular-cli/blob/master/README.md).

## Netlify

Este repositorio incluye `netlify.toml` para fijar:

- Build command: `npm ci && npm run build`
- Publish directory: `dist/frontend`
- Node: `22.21.1`

### Error `git ref pull/<id>/head does not exist`

Si en Netlify aparece este error durante **Preparing repo**, no es un error de Angular ni del build script.
Significa que Netlify está intentando desplegar una referencia de PR que ya no existe (o que no tiene permisos para leer).

Solución en Netlify (UI):

1. **Site settings → Build & deploy → Continuous Deployment → Branch to deploy**: usar una rama real (por ejemplo `master`).
2. Verificar que el repo conectado y credenciales tengan permisos de lectura sobre la rama objetivo.
3. Si el deploy fue disparado por un hook viejo, regenerar el Build Hook apuntando a la rama correcta.

