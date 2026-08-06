export type DieCodeInput = {
  die_code: string;
  die_descriptions: string;
  e_id: number;
  dp_id: number;
};

export type DieCodeDTO = {
  die_id: number;
  die_code: string;
  die_descriptions: string;
  add_date: string;
  e_id: number;
  dp_id: number;
  dp_department: string | null;
  e_name: string | null;
};
