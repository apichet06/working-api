export type WorkingMaster = {
    e_usercode: string,
    job_code: string,
    w_project_no: string,
    job_id: number,
    cc_id: number,
    part_id: number,
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
    part_descriptions: string
}
