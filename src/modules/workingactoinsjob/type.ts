export type WorkingActions = {
    wa_start_job: Date;
    wa_end_job: Date;
    e_id: number;
    w_id: number;
    user_edit: number;
    edit_date: string;
    mark_status: string;
};

export type WorkingActionsDTO = {
    wa_id: number;
    wa_start_job: Date;
    wa_end_job: Date;
    wa_status: string;
    e_id: number;
    w_id: number;
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
