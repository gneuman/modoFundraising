import { NextRequest, NextResponse } from "next/server";

const POSTULA_HOST = "postula.modofundraising.com";
const PORTAL_HOST = "portal.modofundraising.com";

// Rutas permitidas en postula.modofundraising.com
// (todo lo demás redirige a portal.modofundraising.com)
const POSTULA_ALLOWED_EXACT = new Set<string>(["/", "/apply", "/apply/success"]);

function isAllowedInPostula(pathname: string): boolean {
  if (POSTULA_ALLOWED_EXACT.has(pathname)) return true;
  // Permitir cualquier subruta de /apply (futuras pantallas del flujo)
  if (pathname.startsWith("/apply/")) return true;
  return false;
}

export function middleware(req: NextRequest) {
  const host = (req.headers.get("host") ?? "").toLowerCase();
  const pathname = req.nextUrl.pathname;
  const search = req.nextUrl.search;

  // Las APIs nunca se redirigen (cualquier dominio puede llamarlas)
  const isApi = pathname.startsWith("/api/");

  // En postula: solo el formulario (/ y /apply/*). Resto va a portal.
  if (!isApi && host === POSTULA_HOST && !isAllowedInPostula(pathname)) {
    return NextResponse.redirect(`https://${PORTAL_HOST}${pathname}${search}`, 308);
  }

  // En portal: el form de postulación vive en postula. Mandar para allá.
  if (!isApi && host === PORTAL_HOST && (pathname === "/apply" || pathname.startsWith("/apply/"))) {
    return NextResponse.redirect(`https://${POSTULA_HOST}${pathname}${search}`, 308);
  }

  // En portal: la raíz va al login (puerta de entrada del dominio privado).
  if (!isApi && host === PORTAL_HOST && pathname === "/") {
    return NextResponse.redirect(`https://${PORTAL_HOST}/ingresar`, 308);
  }

  // Inyectar pathname para que layouts/admin lo lean
  const res = NextResponse.next();
  res.headers.set("x-pathname", pathname);
  const token = req.cookies.get("mf_session")?.value;
  res.headers.set("x-has-token", token ? "1" : "0");
  return res;
}

export const config = {
  // Aplicar a todo excepto assets estáticos
  matcher: ["/((?!_next/static|_next/image|favicon.ico|logo-mf|logo-mf-azul|.*\\.(?:png|jpg|jpeg|svg|webp|gif|ico|woff|woff2)).*)"],
};
