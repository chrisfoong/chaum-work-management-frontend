import { AuthProvider } from "@/components/auth";
import { Portal } from "@/components/portal";
export default function PortalPage() {
  return (
    <AuthProvider>
      <Portal />
    </AuthProvider>
  );
}
