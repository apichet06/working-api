export type DetailMasterInput = {
  dp_id: number;
  detail_descriptions: string;
  e_id: number;
};

export type DetailMasterDTO = {
  detail_id: number;
  detail_descriptions: string;
  add_date: string;
  e_id: number;
  dp_id: number;
  dp_department: string | null;
  e_name: string | null;
};
