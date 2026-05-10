import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function EditorPage() {
  if (process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_ENABLE_EDITOR !== "true") {
    notFound();
  }

  const { default: EditorClient } = await import("./EditorClient");
  return <EditorClient />;
}
