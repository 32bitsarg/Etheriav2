import { redirect } from "next/navigation";

// Editor movido: vive como tab dentro de /admin
export default function EditorRedirect() {
  redirect("/admin");
}
