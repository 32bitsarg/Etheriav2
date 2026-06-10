import { redirect } from "next/navigation";

// Panel movido: todo lo de administración vive ahora en /admin
export default function MetheriaadmiaRedirect() {
  redirect("/admin");
}
