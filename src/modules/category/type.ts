
export type Category = {
    cc_code: number
    cc_descriptions: string,
    dp_id: number,
    e_id: number
}

export type CategoryDTO = {
    cc_id: number
    cc_code: number
    cc_descriptions: string
    dp_id: number
    dp_department: string | null
}
