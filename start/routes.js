"use strict";

/*
|--------------------------------------------------------------------------
| Routes
|--------------------------------------------------------------------------
|
| Http routes are entry points to your web application. You can create
| routes for different URLs and bind Controller actions to them.
|
| A complete guide on routing is available here.
| http://adonisjs.com/docs/4.1/routing
|
*/

/** @type {typeof import('@adonisjs/framework/src/Route/Manager')} */

const Route = use("Route");

Route.group(() => {
  Route.get("/", () => {
    return { greeting: "Adonis - Hello world in JSON....." };
  });

  Route.get("/teste", () => {
    return { m: "teste" };
  });

  Route.post("/users", "UserController.store");
  Route.post("/sessions", "sessionController.store");

  Route.post("/passwords", "ForgotController.store");
  Route.put("/passwords", "ForgotController.update");
}).prefix("api");
