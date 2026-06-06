import { I18nClientProvider } from "@/components/I18nClientProvider";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <I18nClientProvider>{children}</I18nClientProvider>;
}
