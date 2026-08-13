export type WorkingMaster = {
    e_usercode: string,
    job_code: string,
    w_project_no: string,
    job_id: number,
    cc_id: number,
    part_id: number,
    mac_id: number | null,
    cc_code: string,
    part_code: string,
    w_desc: string,
    e_id: number
}

export type WorkingMasterDTO = {
    w_id: number
    e_usercode: string,
    job_code: string,
    job_id: number,
    w_project_no: string,
    cc_id: number,
    part_id: number,
    mac_id: number | null,
    cc_code: string,
    part_code: string,
    w_desc: string,
    e_id: number,
    w_date: Date,
    wa_id: number | null,
    wa_start_job: Date | null,
    wa_end_job: Date | null,
    wa_status: string | null,
    user_edit: number | null,
    edit_date: Date | null,
    cc_descriptions: string,
    job_descriptions: string,
    part_descriptions: string,
    mac_code: string | null,
    mac_descriptions: string | null,
    die_descriptions: string | null,
    end_job: number,
    // คำนวณจาก MySQL server เอง (TIMESTAMPDIFF กับ NOW() ของ server เดียวกัน) ไม่ใช่เทียบกับนาฬิกาเครื่อง
    // client เลย กัน browser/server เวลาไม่ตรงกันแล้ว elapsed ผิด - null ถ้ายังไม่เริ่มงาน
    elapsed_seconds: number | null
}
