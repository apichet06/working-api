export type MachineCodeInput = {
  mac_code: string;
  mac_descriptions: string;
  e_id: number;
  dp_id: number;
  wp_id: number;
};

export type MachineCodeDTO = {
  mac_id: number;
  mac_code: string;
  mac_descriptions: string;
  add_date: string;
  e_id: number;
  dp_id: number;
  wp_id: number;
  dp_department: string | null;
  wp_name: string | null;
  e_name: string | null;
};
