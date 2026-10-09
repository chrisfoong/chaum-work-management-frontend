import { AuthProvider } from "@/components/auth";
import { Portal } from "@/components/portal";
export default function WebPage() {
  return (
    <AuthProvider entryPlatform="web">
      <Portal />
    </AuthProvider>
  );
}
