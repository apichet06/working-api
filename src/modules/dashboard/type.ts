export type YearlySummaryRow = {
    month: number;
    total_hours: number;
    job_hour: number;
};

export type MonthlySummaryRow = {
    day: number;
    total_hours: number;
    job_hour: number;
};

export type EmployeeJobCountRow = {
    e_id: number;
    job_count: number;
};

export type JobBreakdownRow = {
    job_code: string;
    job_descriptions: string;
    total_hours: number;
    job_hour: number;
};

export type ProjectBreakdownRow = {
    w_project_no: string;
    die_descriptions: string | null;
    total_hours: number;
    job_hour: number;
};
