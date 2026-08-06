export type WorkingReportDTO = {
    wa_id: number;
    e_usercode: string;
    w_project_no: string;
    job_desc: string;
    w_desc: string;
    part_desc: string;
    cc_desc: string;
    working_date: string;
    job_hour: number;
    labour_hour: number;
    cc_code: string;
    job_code: string;
    part_code: string;
    mac_code: string | null;
    mac_desc: string | null;
};