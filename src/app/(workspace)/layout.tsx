import { Shell } from "@/components/Shell";

export const dynamic = "force-dynamic";

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return <Shell>{children}</Shell>;
}
