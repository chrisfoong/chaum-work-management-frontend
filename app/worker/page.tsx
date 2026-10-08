import { AuthProvider } from "@/components/auth";
import { Portal } from "@/components/portal";
export default function WorkerPage() {
  return (
    <AuthProvider entryPlatform="worker">
      <Portal />
    </AuthProvider>
  );
}
