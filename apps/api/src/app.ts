import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import cors from "cors";
import express, { type Response } from "express";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import { z } from "zod";
import { allow, authenticate, signToken } from "./auth.js";
import { audit, db, initDatabase } from "./db.js";
import type { AuthRequest, SessionUser } from "./types.js";

const patientInput=z.object({firstName:z.string().min(2).max(80),lastName:z.string().min(2).max(80),dateOfBirth:z.string(),phone:z.string().max(30).optional(),email:z.string().email().optional(),riskLevel:z.enum(["LOW","MEDIUM","HIGH"]).default("LOW")});
const appointmentInput=z.object({patientId:z.string().uuid(),clinicianId:z.string().uuid(),startsAt:z.string().datetime(),durationMinutes:z.number().int().min(15).max(180),type:z.enum(["INITIAL","FOLLOW_UP","PROCEDURE","TELEHEALTH"]),notes:z.string().max(1000).optional()});
const caseInput=z.object({patientId:z.string().uuid(),title:z.string().min(3).max(160),priority:z.enum(["LOW","NORMAL","HIGH","URGENT"]).default("NORMAL"),ownerId:z.string().uuid(),summary:z.string().max(2000).optional()});

export async function createApp() {
  await initDatabase();
  const app=express();
  app.use(helmet()); app.use(cors({origin:process.env.WEB_ORIGIN||"http://localhost:5173"})); app.use(express.json({limit:"200kb"})); app.use(pinoHttp());
  app.get("/api/health",(_req,res)=>res.json({status:"ok",service:"careflow-api",time:new Date().toISOString()}));
  app.post("/api/auth/login",async(req,res)=>{
    const parsed=z.object({email:z.string().email(),password:z.string().min(6)}).safeParse(req.body);
    if(!parsed.success)return res.status(400).json({error:"invalid_credentials_format"});
    const found=await db().query("SELECT id,name,email,password_hash,role FROM users WHERE email=$1",[parsed.data.email.toLowerCase()]);
    const user=found.rows[0]; if(!user||!bcrypt.compareSync(parsed.data.password,user.password_hash))return res.status(401).json({error:"invalid_credentials"});
    const session:SessionUser={id:user.id,name:user.name,email:user.email,role:user.role};
    await audit(user.id,"LOGIN","SESSION",null); return res.json({token:signToken(session),user:session});
  });
  app.use("/api",authenticate);
  app.get("/api/me",(req:AuthRequest,res)=>res.json(req.user));
  app.get("/api/users",async(_req,res)=>{const r=await db().query("SELECT id,name,email,role FROM users ORDER BY name");res.json(r.rows)});
  app.get("/api/dashboard",async(_req,res)=>{
    const [patients,today,open,high]=await Promise.all([
      db().query("SELECT COUNT(*)::int count FROM patients"),
      db().query("SELECT COUNT(*)::int count FROM appointments WHERE starts_at::date=CURRENT_DATE"),
      db().query("SELECT COUNT(*)::int count FROM clinical_cases WHERE stage<>'CLOSED'"),
      db().query("SELECT COUNT(*)::int count FROM clinical_cases WHERE priority IN ('HIGH','URGENT') AND stage<>'CLOSED'")]);
    res.json({patients:Number(patients.rows[0].count),appointmentsToday:Number(today.rows[0].count),openCases:Number(open.rows[0].count),highPriority:Number(high.rows[0].count)});
  });
  app.get("/api/patients",async(req,res)=>{const q=String(req.query.q||"");const r=await db().query("SELECT * FROM patients WHERE first_name ILIKE $1 OR last_name ILIKE $1 OR medical_record_number ILIKE $1 ORDER BY created_at DESC",[`%${q}%`]);res.json(r.rows)});
  app.post("/api/patients",allow("ADMIN","CLINICIAN","RECEPTIONIST"),async(req:AuthRequest,res:Response)=>{
    const p=patientInput.safeParse(req.body);if(!p.success)return res.status(400).json({error:"validation_failed",issues:p.error.issues});
    const id=randomUUID(),mrn=`CF-${new Date().getFullYear()}-${Math.floor(1000+Math.random()*9000)}`;
    const r=await db().query("INSERT INTO patients (id,medical_record_number,first_name,last_name,date_of_birth,phone,email,risk_level) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *",[id,mrn,p.data.firstName,p.data.lastName,p.data.dateOfBirth,p.data.phone||null,p.data.email||null,p.data.riskLevel]);await audit(req.user!.id,"CREATE","PATIENT",id,{mrn});res.status(201).json(r.rows[0]);
  });
  app.patch("/api/patients/:id",allow("ADMIN","CLINICIAN"),async(req:AuthRequest,res:Response)=>{
    const p=z.object({riskLevel:z.enum(["LOW","MEDIUM","HIGH"]),expectedVersion:z.number().int().positive()}).safeParse(req.body);if(!p.success)return res.status(400).json({error:"validation_failed"});
    const entityId=String(req.params.id);const r=await db().query("UPDATE patients SET risk_level=$1,version=version+1,updated_at=now() WHERE id=$2 AND version=$3 RETURNING *",[p.data.riskLevel,entityId,p.data.expectedVersion]);if(!r.rowCount)return res.status(409).json({error:"version_conflict"});await audit(req.user!.id,"UPDATE_RISK","PATIENT",entityId,{risk:p.data.riskLevel});res.json(r.rows[0]);
  });
  app.get("/api/appointments",async(_req,res)=>{const r=await db().query("SELECT a.*,p.first_name,p.last_name,p.medical_record_number,u.name clinician_name FROM appointments a JOIN patients p ON p.id=a.patient_id JOIN users u ON u.id=a.clinician_id ORDER BY starts_at");res.json(r.rows)});
  app.post("/api/appointments",allow("ADMIN","CLINICIAN","RECEPTIONIST"),async(req:AuthRequest,res:Response)=>{const p=appointmentInput.safeParse(req.body);if(!p.success)return res.status(400).json({error:"validation_failed",issues:p.error.issues});const id=randomUUID();const r=await db().query("INSERT INTO appointments (id,patient_id,clinician_id,starts_at,duration_minutes,type,notes) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *",[id,p.data.patientId,p.data.clinicianId,p.data.startsAt,p.data.durationMinutes,p.data.type,p.data.notes||null]);await audit(req.user!.id,"CREATE","APPOINTMENT",id);res.status(201).json(r.rows[0])});
  app.patch("/api/appointments/:id/status",allow("ADMIN","CLINICIAN","RECEPTIONIST"),async(req:AuthRequest,res:Response)=>{const p=z.object({status:z.enum(["SCHEDULED","CHECKED_IN","COMPLETED","CANCELLED"])}).safeParse(req.body);if(!p.success)return res.status(400).json({error:"validation_failed"});const entityId=String(req.params.id);const r=await db().query("UPDATE appointments SET status=$1 WHERE id=$2 RETURNING *",[p.data.status,entityId]);if(!r.rowCount)return res.status(404).json({error:"appointment_not_found"});await audit(req.user!.id,"STATUS_CHANGE","APPOINTMENT",entityId,{status:p.data.status});res.json(r.rows[0])});
  app.get("/api/cases",async(_req,res)=>{const r=await db().query("SELECT c.*,p.first_name,p.last_name,p.medical_record_number,u.name owner_name FROM clinical_cases c JOIN patients p ON p.id=c.patient_id JOIN users u ON u.id=c.owner_id ORDER BY c.updated_at DESC");res.json(r.rows)});
  app.post("/api/cases",allow("ADMIN","CLINICIAN"),async(req:AuthRequest,res:Response)=>{const p=caseInput.safeParse(req.body);if(!p.success)return res.status(400).json({error:"validation_failed",issues:p.error.issues});const id=randomUUID();const r=await db().query("INSERT INTO clinical_cases (id,patient_id,title,priority,owner_id,summary) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *",[id,p.data.patientId,p.data.title,p.data.priority,p.data.ownerId,p.data.summary||null]);await audit(req.user!.id,"CREATE","CASE",id);res.status(201).json(r.rows[0])});
  app.patch("/api/cases/:id/stage",allow("ADMIN","CLINICIAN"),async(req:AuthRequest,res:Response)=>{const p=z.object({stage:z.enum(["INTAKE","REVIEW","TREATMENT","CLOSED"]),expectedVersion:z.number().int().positive()}).safeParse(req.body);if(!p.success)return res.status(400).json({error:"validation_failed"});const entityId=String(req.params.id);const r=await db().query("UPDATE clinical_cases SET stage=$1,version=version+1,updated_at=now() WHERE id=$2 AND version=$3 RETURNING *",[p.data.stage,entityId,p.data.expectedVersion]);if(!r.rowCount)return res.status(409).json({error:"version_conflict"});await audit(req.user!.id,"STAGE_CHANGE","CASE",entityId,{stage:p.data.stage});res.json(r.rows[0])});
  app.get("/api/audit",allow("ADMIN","CLINICIAN"),async(_req,res)=>{const r=await db().query("SELECT l.*,u.name actor_name FROM audit_logs l LEFT JOIN users u ON u.id=l.actor_id ORDER BY l.created_at DESC LIMIT 100");res.json(r.rows)});
  app.use((err:unknown,_req:express.Request,res:express.Response,_next:express.NextFunction)=>{console.error(err);res.status(500).json({error:"internal_server_error"})});
  return app;
}
