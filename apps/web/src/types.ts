export type User={id:string;name:string;email:string;role:"ADMIN"|"CLINICIAN"|"RECEPTIONIST"};
export type Patient={id:string;medical_record_number:string;first_name:string;last_name:string;date_of_birth:string;phone?:string;email?:string;risk_level:"LOW"|"MEDIUM"|"HIGH";version:number};
export type Appointment={id:string;patient_id:string;clinician_id:string;starts_at:string;duration_minutes:number;type:string;status:string;first_name:string;last_name:string;medical_record_number:string;clinician_name:string};
export type ClinicalCase={id:string;patient_id:string;title:string;stage:string;priority:string;owner_id:string;summary?:string;version:number;first_name:string;last_name:string;medical_record_number:string;owner_name:string};
export type AuditLog={id:string;actor_name:string;action:string;entity_type:string;entity_id?:string;created_at:string};
