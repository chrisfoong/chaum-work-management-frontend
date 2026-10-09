"use client";
import { useState } from "react";
import { AuthProvider, PreviewPicker } from "@/components/auth";
import { Portal } from "@/components/portal";
import type { Role } from "@/lib/types";
export default function Preview() {
  const [role, setRole] = useState<Role>("supervisor");
  return (
    <>
      <PreviewPicker role={role} setRole={setRole} />
      <AuthProvider key={role} previewRole={role}>
        <Portal />
      </AuthProvider>
    </>
  );
}
