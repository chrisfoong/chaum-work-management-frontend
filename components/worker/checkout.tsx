"use client";
import { checkoutTimeReached } from "@/lib/worker-actions";
import { useSession } from "../auth";
import { ActionForm, Field, Inputs, fdString, fileFrom } from "../ui";
import { useCurrentTime } from "@/lib/use-current-time";
import { clock, dateThai } from "@/lib/domain";
import { str, type Row } from "@/lib/types";

export function Checkout({
  row,
  onClose,
  onDone,
}: {
  row: Row;
  onClose: () => void;
  onDone: () => void;
}) {
  const { api } = useSession();
  const now = useCurrentTime();
  const timeReached = checkoutTimeReached(row, now);
  return (
    <ActionForm
      title="ส่งผลงานและเช็กเอาท์"
      onClose={onClose}
      onDone={onDone}
      submitDisabled={!timeReached}
      submit={async (fd) => {
        if (!checkoutTimeReached(row, Date.now()))
          throw new Error("ยังไม่ถึงเวลาจบกะ กรุณาเช็กเอาท์ตามเวลาที่แสดง");
        const photo = await fileFrom(fd, "photo", api);
        return api.post("attendance/check-out", {
          schedule_id: str(row, "schedule_id"),
          description: fdString(fd, "description"),
          photo_path: photo,
        });
      }}
    >
      <p>
        {str(row, "project_name")} · {str(row, "location_name")}
      </p>
      {!timeReached && (
        <p className="notice" role="alert">
          ยังไม่ถึงเวลาจบกะ เช็กเอาท์ได้เวลา {clock(str(row, "shift_end_at"))} ·{" "}
          {dateThai(str(row, "shift_end_at"))}
        </p>
      )}
      <Inputs
        fields={[
          {
            name: "description",
            label: "รายละเอียดงานที่ทำ",
            type: "textarea",
            maxLength: 1000,
          },
        ]}
      />
      <Field label="รูปผลงาน JPG / PNG ≤5 MB">
        <input
          name="photo"
          aria-label="รูปผลงาน"
          type="file"
          accept="image/jpeg,image/png"
          capture="environment"
          required
        />
      </Field>
      <p className="notice">
        ระบบบันทึกเวลาจบงานจาก Server ต้องเช็กอินก่อนส่งผลงาน
      </p>
    </ActionForm>
  );
}
