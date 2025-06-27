import { ActionFunctionArgs } from "@remix-run/node";
import { authenticator } from "../services/auth.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  return authenticator.authenticate("google", request, {
    successRedirect: "/",
    failureRedirect: "/login?error=1",
  });
};

export const loader = () => {
  return new Response("Not Found", { status: 404 });
}; 