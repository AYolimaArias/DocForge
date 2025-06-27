import { LoaderFunctionArgs, redirect } from "@remix-run/node";
import { getSession, sessionStorage } from "../services/session.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const session = await getSession(request);
  return redirect("/login", {
    headers: {
      "Set-Cookie": await sessionStorage.destroySession(session),
    },
  });
};

export const action = loader; 