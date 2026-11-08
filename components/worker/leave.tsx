"use client";
import { eligibleLeaveDates } from "@/lib/leave";
import { useSession } from "../auth";
import {
  ActionForm,
  Badge,
  Empty,
  Inputs,
  Resource,
  fdString,
  useData,
} from "../ui";
import { dateThai, todayBangkok } from "@/lib/domain";
import { str } from "@/lib/types";

export function WorkerLeave({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: () => void;
}) {
  const { api, list } = useSession();
  const resource = useData(async (signal) => {
    const [schedules, leaves] = await Promise.all([
      list("schedules?limit=100", signal),
      list(`leave-requests?period_start=${todayBangkok()}&limit=100`, signal),
    ]);
    return { schedules, leaves };
  }, []);
  const dates = eligibleLeaveDates(
    resource.data?.schedules || [],
    resource.data?.leaves || [],
    todayBangkok(),
  );

  return (
    <ActionForm
      title="แจ้งลา"
      onClose={onClose}
      onDone={onDone}
      submitDisabled={!resource.data || dates.length === 0}
      submit={async (fd) => {
        const date = fdString(fd, "date");
        if (!dates.includes(date))
          throw new Error("วันที่นี้ยื่นใบลาแล้ว หรือไม่มีกะงานที่แจ้งลาได้");
        try {
          return await api.post("leave-requests", {
            leave_date: date,
            reason: fdString(fd, "reason"),
          });
        } catch (error) {
          if (
            error instanceof Error &&
            error.message.includes("leave already exists for date")
          ) {
            resource.refresh();
            throw new Error("คุณยื่นใบลาสำหรับวันนี้แล้ว ไม่สามารถยื่นซ้ำได้");
          }
          throw error;
        }
      }}
    >
      <Resource {...resource} retry={resource.refresh}>
        {dates.length > 0 ? (
          <Inputs
            fields={[
              {
                name: "date",
                label: "วันที่มีกะงาน",
                options: dates.map((d) => ({ value: d, label: dateThai(d) })),
              },
              {
                name: "reason",
                label: "เหตุผลการลา",
                type: "textarea",
                maxLength: 500,
              },
            ]}
          />
        ) : (
          <Empty
            text="ไม่มีกะงานที่แจ้งลาได้"
            detail="วันที่ยื่นใบลาแล้วจะไม่แสดงให้ยื่นซ้ำ แม้คำขอถูกปฏิเสธ"
          />
        )}
        {resource.data?.leaves.length ? (
          <div className="notice">
            <strong>ใบลาที่ส่งแล้ว</strong>
            {resource.data.leaves.map((leave) => (
              <p key={str(leave, "request_id")}>
                {dateThai(str(leave, "leave_date"))} ·{" "}
                <Badge value={leave.status} />
              </p>
            ))}
          </div>
        ) : null}
      </Resource>
      <p className="notice">
        วันอนาคตเป็นลาล่วงหน้า วันปัจจุบันเป็นลาฉุกเฉิน
        ผู้ดูแลงานจะพิจารณาและจัดคนแทน
      </p>
    </ActionForm>
  );
}
