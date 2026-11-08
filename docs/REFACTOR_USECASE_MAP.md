# Use Case module organization — 2026-11-08

Existing import paths remain compatible: `components/worker.tsx`, `components/procurement.tsx`, and `components/finance.tsx` re-export their original public components. The page layout, JSX, form actions, API payloads, hooks, permission checks, labels and business behavior are retained.

| Use Case                                              | Component module                                    |
| ----------------------------------------------------- | --------------------------------------------------- |
| 1W — current work                                     | `components/worker/home.tsx`                        |
| 2W — leave                                            | `components/worker/leave.tsx`                       |
| 3W — GPS and QR check-in                              | `components/worker/check-in.tsx`                    |
| 4W — evidence and checkout                            | `components/worker/checkout.tsx`                    |
| 5W — equipment shortage                               | `components/worker/shortage.tsx`                    |
| 7W — paid payslips                                    | `components/worker/payslips.tsx`                    |
| Shared profile                                        | `components/worker/profile.tsx`, also used by staff |
| Procurement list                                      | `components/procurement/list.tsx`                   |
| 5A — inspection/detail                                | `components/procurement/detail.tsx`                 |
| 1A / 6A / 3S / 2S / 8A — existing actions             | `components/procurement/action.tsx`                 |
| 2A / 7A — purchase preview and confirmation           | `components/procurement/purchase.tsx`               |
| 4S / 5S — attendance processing and payroll UI        | `components/finance/payroll.tsx`                    |
| 6S / 9A — financial report and manual summary trigger | `components/finance/reports.tsx`                    |

6W remains LINE Chat rather than an additional inbox screen. All actions still use the existing verified session; splitting the UI does not grant additional roles. The shared purchase form stays shared because initial and additional requests use the same API with existing type-specific rules.

The 15 moved declarations were compared structurally against the originals, and the original public exports are preserved. Existing lint, TypeScript, formatting and 57 tests pass. Production build passes with `npm run build -- --webpack`; the default Turbopack run cannot resolve the dependency junction outside this worktree root. No production build configuration was changed to work around that local setup limitation. Runtime/backend authority and real-device testing remain separate. No production configuration or database changes are included.
