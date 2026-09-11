export type ActiveProjectMemberDTO = {
  e_id: number;
  e_usercode: string | null;
  e_name: string;
  started_at: Date;
  elapsed_seconds: number;
  is_working: boolean;
  job_code: string;
  cc_code: string;
  part_code: string;
  w_desc: string;
};

export type ActiveProjectDTO = {
  project_no: string;
  die_descriptions: string | null;
  started_at: Date;
  elapsed_seconds: number;
  member_count: number;
  active_member_count: number;
  members: ActiveProjectMemberDTO[];
};
