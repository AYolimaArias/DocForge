import { useState } from "react";
import { Form, useActionData, useNavigation } from "@remix-run/react";
import { ActionFunctionArgs, json, redirect } from "@remix-run/node";
import { authenticator, registerUser } from "../services/auth.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const form = await request.formData();
  const intent = form.get("intent");
  if (intent === "register") {
    const email = form.get("email")?.toString();
    const password = form.get("password")?.toString();
    const name = form.get("name")?.toString();
    if (!email || !password) return json({ error: "Email y contraseña requeridos" }, { status: 400 });
    try {
      await registerUser(email, password, name);
      return redirect("/login?registered=1");
    } catch (e) {
      return json({ error: "El email ya está registrado" }, { status: 400 });
    }
  }
  // Login normal
  return authenticator.authenticate("user-pass", request, {
    successRedirect: "/",
    failureRedirect: "/login?error=1",
  });
};

export default function Login() {
  const [step, setStep] = useState<"email" | "password">("email");
  const [email, setEmail] = useState("");
  const [showRegister, setShowRegister] = useState(false);
  const actionData = useActionData<typeof action>();
  const transition = useNavigation();

  return (
    <div className="min-h-screen flex">
      {/* Columna izquierda oscura con patrón */}
      <div className="hidden md:block w-1/3 bg-[#181C2A] text-white flex items-center justify-center relative">
        <div className="absolute inset-0 opacity-20" style={{backgroundImage: 'radial-gradient(rgba(255,255,255,0.08) 1px, transparent 1px)', backgroundSize: '20px 20px'}} />
        <div className="relative z-10 text-lg font-bold ml-6 mt-6">Codeable</div>
      </div>
      {/* Columna derecha: formulario */}
      <div className="flex-1 flex items-center justify-center bg-white">
        <div className="w-full max-w-md p-8 rounded-xl shadow-lg bg-white">
          <div className="flex flex-col items-center mb-6">
            <span className="text-2xl font-bold mb-2 text-black">Iniciar Sesión</span>
            <span className="text-gray-700 text-sm text-center">
              Accede a tu asistente de documentación inteligente con IA
            </span>
          </div>
          <Form method="post" className="space-y-4">
            {step === "email" && (
              <>
                <input
                  type="email"
                  name="email"
                  placeholder="Ingresa tu email"
                  className="w-full border border-gray-300 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 text-black bg-gray-100"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="w-full bg-[#1CB5E0] hover:bg-[#1597bb] text-white py-2 rounded font-semibold mt-2 transition-colors"
                  onClick={() => setStep("password")}
                  disabled={!email}
                >
                  Continuar
                </button>
              </>
            )}
            {step === "password" && (
              <>
                <input type="hidden" name="email" value={email} />
                <input
                  type="password"
                  name="password"
                  placeholder="Contraseña"
                  className="w-full border border-gray-300 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 text-black bg-gray-100"
                  required
                />
                <button
                  type="submit"
                  className="w-full bg-[#1CB5E0] hover:bg-[#1597bb] text-white py-2 rounded font-semibold mt-2 transition-colors"
                  disabled={transition.state === "submitting"}
                >
                  {transition.state === "submitting" ? "Ingresando..." : "Ingresar"}
                </button>
                <button
                  type="button"
                  className="w-full text-blue-500 text-sm mt-2"
                  onClick={() => setStep("email")}
                >
                  Volver
                </button>
              </>
            )}
          </Form>
          <div className="flex items-center my-4">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="mx-2 text-gray-400 text-xs">o</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>
          <form action="/auth/google" method="post">
            <button
              type="submit"
              className="w-full flex items-center justify-center border border-gray-300 rounded py-2 bg-white hover:bg-gray-50 font-semibold text-black"
            >
              <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5 mr-2" />
              Iniciar Sesión con Google
            </button>
          </form>
          {actionData?.error && (
            <div className="mt-4 text-red-500 text-center text-sm">{actionData.error}</div>
          )}
        </div>
      </div>
    </div>
  );
} 