export type WorkingActions = {
  wa_start_job: Date;
  wa_end_job: Date;
  e_id: number;
  w_id: number;
  user_edit: number;
  edit_date: string;
  mark_status: string;
};

// เนื้อหางาน (ไม่รวมเวลา) ที่แก้ไขได้โดยตรงบน WorkingActionJob — ใช้โดยหน้า "ตรวจสอบ/แก้ไขงานย้อนหลัง"
export type WorkingActionJobDetailInput = {
  job_id: number;
  job_code: string;
  cc_id: number;
  cc_code: string;
  part_id: number;
  part_code: string;
  mac_id: number | null;
  w_desc: string;
  w_project_no: string;
};

export type WorkingActionsDTO = {
  wa_id: number;
  wa_start_job: Date;
  wa_end_job: Date;
  wa_status: string;
};

// หนึ่งแถว = หนึ่ง WorkingActionJob (การเริ่ม/ปิดงานแต่ละครั้ง) ใช้สำหรับปฏิทิน
// ต่างจาก WorkingMasterDTO ที่ join เอาแค่ action ล่าสุดของแต่ละ w_id
export type WorkingActionCalendarDTO = {
  wa_id: number;
  wa_start_job: Date;
  wa_end_job: Date | null;
  wa_status: string | null;
  w_id: number;
  job_code: string;
  w_desc: string;
  w_project_no: string;
  cc_code: string;
  part_code: string;
  cc_descriptions: string;
  job_descriptions: string;
  part_descriptions: string;
};

export type WorkingActionsJobListDTO = {
  wa_id: number;
  wa_start_job: Date;
  wa_end_job: Date | null;
  wa_status: string | null;
  e_id: number;
  w_id: number;
  user_edit: number;
  edit_date: string;
  e_usercode: string;
  w_project_no: string;
  job_desc: string;
  w_desc: string;
  part_desc: string;
  cc_desc: string;
  working_date: Date;
  working_time: string;
  job_hour: number;
  labour_hour: number;
  mac_desc: string | null;
  die_desc: string | null;
};
