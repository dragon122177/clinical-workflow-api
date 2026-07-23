import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { newDb } from "pg-mem";
import { Pool as PgPool } from "pg";

type Queryable = { query: (text: string, params?: unknown[]) => Promise<{ rows: any[]; rowCount: number | null }> };

const schema = `
CREATE TABLE IF NOT EXISTS users (id uuid PRIMARY KEY, name text NOT NULL, email text UNIQUE NOT NULL, password_hash text NOT NULL, role text NOT NULL, created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS patients (id uuid PRIMARY KEY, medical_record_number text UNIQUE NOT NULL, first_name text NOT NULL, last_name text NOT NULL, date_of_birth date NOT NULL, phone text, email text, risk_level text NOT NULL DEFAULT 'LOW', version integer NOT NULL DEFAULT 1, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS appointments (id uuid PRIMARY KEY, patient_id uuid REFERENCES patients(id), clinician_id uuid REFERENCES users(id), starts_at timestamptz NOT NULL, duration_minutes integer NOT NULL DEFAULT 30, type text NOT NULL, status text NOT NULL DEFAULT 'SCHEDULED', notes text, created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS clinical_cases (id uuid PRIMARY KEY, patient_id uuid REFERENCES patients(id), title text NOT NULL, stage text NOT NULL DEFAULT 'INTAKE', priority text NOT NULL DEFAULT 'NORMAL', owner_id uuid REFERENCES users(id), summary text, version integer NOT NULL DEFAULT 1, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS audit_logs (id uuid PRIMARY KEY, actor_id uuid REFERENCES users(id), action text NOT NULL, entity_type text NOT NULL, entity_id uuid, metadata jsonb NOT NULL DEFAULT '{}', created_at timestamptz DEFAULT now());
CREATE INDEX IF NOT EXISTS idx_appointments_starts_at ON appointments(starts_at);
CREATE INDEX IF NOT EXISTS idx_cases_patient ON clinical_cases(patient_id);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_logs(created_at);
`;

let pool: Queryable;

export async function initDatabase() {
  if (pool) return pool;
  if (process.env.DATABASE_URL) {
    pool = new PgPool({ connectionString: process.env.DATABASE_URL });
    await pool.query(schema);
  } else {
    const memory = newDb({ autoCreateForeignKeyIndices: true });
    memory.public.none(schema);
    const adapter = memory.adapters.createPg();
    pool = new adapter.Pool() as Queryable;
  }
  await seed();
  return pool;
}

export function db(): Queryable {
  if (!pool) throw new Error("database_not_initialized");
  return pool;
}

async function seed() {
  const count = await pool.query("SELECT COUNT(*)::int AS count FROM users");
  if (Number(count.rows[0].count) > 0) return;
  const password = bcrypt.hashSync("demo1234", 10);
  const admin = randomUUID(), clinician = randomUUID(), receptionist = randomUUID();
  await pool.query("INSERT INTO users (id,name,email,password_hash,role) VALUES ($1,$2,$3,$4,$5),($6,$7,$8,$9,$10),($11,$12,$13,$14,$15)", [
    admin,"Maya Chen","admin@careflow.demo",password,"ADMIN",
    clinician,"Dr. Sofia Rivera","sofia@careflow.demo",password,"CLINICIAN",
    receptionist,"Alex Morgan","alex@careflow.demo",password,"RECEPTIONIST"
  ]);
  const p1=randomUUID(), p2=randomUUID(), p3=randomUUID();
  await pool.query("INSERT INTO patients (id,medical_record_number,first_name,last_name,date_of_birth,phone,email,risk_level) VALUES ($1,$2,$3,$4,$5,$6,$7,$8),($9,$10,$11,$12,$13,$14,$15,$16),($17,$18,$19,$20,$21,$22,$23,$24)",[
    p1,"CF-2026-001","Avery","Stone","1989-04-11","555-0101","avery@example.test","LOW",
    p2,"CF-2026-002","Noah","Williams","1978-09-22","555-0102","noah@example.test","MEDIUM",
    p3,"CF-2026-003","Emma","Davis","1995-01-17","555-0103","emma@example.test","HIGH"
  ]);
  const now=Date.now();
  await pool.query("INSERT INTO appointments (id,patient_id,clinician_id,starts_at,duration_minutes,type,status) VALUES ($1,$2,$3,$4,$5,$6,$7),($8,$9,$10,$11,$12,$13,$14)",[
    randomUUID(),p1,clinician,new Date(now+3600000).toISOString(),30,"FOLLOW_UP","SCHEDULED",
    randomUUID(),p3,clinician,new Date(now+7200000).toISOString(),45,"INITIAL","CHECKED_IN"
  ]);
  await pool.query("INSERT INTO clinical_cases (id,patient_id,title,stage,priority,owner_id,summary) VALUES ($1,$2,$3,$4,$5,$6,$7),($8,$9,$10,$11,$12,$13,$14)",[
    randomUUID(),p2,"Mobility care plan","REVIEW","NORMAL",clinician,"Review progress and update care objectives.",
    randomUUID(),p3,"Post-visit coordination","TREATMENT","HIGH",clinician,"Coordinate follow-up and document outcomes."
  ]);
}

export async function audit(actorId:string, action:string, entityType:string, entityId:string|null, metadata:Record<string,unknown>={}) {
  await db().query("INSERT INTO audit_logs (id,actor_id,action,entity_type,entity_id,metadata) VALUES ($1,$2,$3,$4,$5,$6)",[randomUUID(),actorId,action,entityType,entityId,JSON.stringify(metadata)]);
}
