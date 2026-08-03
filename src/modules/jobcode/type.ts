export type JobCode = {
    job_code: number
    dp_id: number
    job_descriptions: string
    e_id: number
}

export type JobCodeDTO = {
    job_id: number
    job_code: number
    dp_id: number
    job_descriptions: string
    dp_department: string | null
    e_id: number
}