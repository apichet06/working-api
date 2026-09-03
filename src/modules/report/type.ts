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
  e_id: number;
  e_name: string | null;
  wa_plant: string | null;
  wp_name_en: string | null;
};

export type WorkingReportTemplateRowDTO = {
  wa_id: number;
  e_id: number;
  e_usercode: string;
  e_firstname_th: string | null;
  working_date: string;
  wa_start_job: string;
  wa_end_job: string;
  job_code: string;
  mac_code: string | null;
  w_project_no: string;
  cc_code: string;
  part_code: string;
  w_desc: string;
  wp_name_en: string | null;
};

export type ReportMasterCodeDTO = {
  code: string;
  description: string;
};

export type WorkingReportTemplateDTO = {
  rows: WorkingReportTemplateRowDTO[];
  codes: {
    jobs: ReportMasterCodeDTO[];
    dies: ReportMasterCodeDTO[];
    categories: ReportMasterCodeDTO[];
    parts: ReportMasterCodeDTO[];
  };
};
