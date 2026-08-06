export type PartCode = {
    part_code: string;
    part_descriptions: string;
    dp_id: number;
    e_id: number;
}
export type PartCodeDTO = {
    part_id: number;
    part_code: string;
    part_descriptions: string;
    dp_id: number;
    dp_department: string | null;
}
