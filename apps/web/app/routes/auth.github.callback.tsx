import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";

import { authenticator } from "~/services/auth.server";

export let loader = ({ request }: LoaderFunctionArgs) => {
  return authenticator.authenticate("github", request, {
    successRedirect: "/",
    failureRedirect: "/", // Redirigir a la página principal en caso de fallo
  });
}; 