import type { ReactNode } from "react";
import { Activity,CalendarDays,ClipboardList,LayoutDashboard,LogOut,Menu,ShieldCheck,Users,X } from "lucide-react";
import type { User } from "./types";

export type View="dashboard"|"patients"|"appointments"|"cases"|"audit";
export function Shell({user,view,setView,onLogout,children}:{user:User;view:View;setView:(v:View)=>void;onLogout:()=>void;children:ReactNode}){
  const items:[View,ReactNode,string][]= [["dashboard",<LayoutDashboard/>,"Overview"],["patients",<Users/>,"Patients"],["appointments",<CalendarDays/>,"Appointments"],["cases",<ClipboardList/>,"Cases"],["audit",<ShieldCheck/>,"Audit log"]];
  return <div className="app-shell"><input id="nav-toggle" type="checkbox" hidden/><aside className="sidebar"><div className="brand"><span className="brand-mark"><Activity/></span><span>CareFlow<small>Clinical operations</small></span><label htmlFor="nav-toggle" className="close-nav"><X/></label></div><nav>{items.map(([id,icon,label])=><button key={id} className={view===id?"active":""} onClick={()=>setView(id)}>{icon}<span>{label}</span></button>)}</nav><div className="profile"><div className="avatar">{user.name.split(" ").map(x=>x[0]).slice(0,2)}</div><div><strong>{user.name}</strong><small>{user.role.toLowerCase()}</small></div><button className="logout" onClick={onLogout} aria-label="Log out"><LogOut/></button></div></aside><main><header className="topbar"><label htmlFor="nav-toggle" className="menu"><Menu/></label><div><span className="eyebrow">DEMO WORKSPACE</span><strong>Northstar Clinic</strong></div><span className="secure"><ShieldCheck/> Secure session</span></header>{children}</main></div>
}
export function PageHeader({eyebrow,title,description,action}:{eyebrow:string;title:string;description:string;action?:ReactNode}){return <div className="page-header"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{action}</div>}
export function Badge({children,tone="neutral"}:{children:ReactNode;tone?:string}){return <span className={`badge ${tone.toLowerCase()}`}>{children}</span>}
export function Empty({message}:{message:string}){return <div className="empty"><ClipboardList/><p>{message}</p></div>}
export function Modal({title,onClose,children}:{title:string;onClose:()=>void;children:ReactNode}){return <div className="modal-backdrop" onMouseDown={onClose}><section className="modal" onMouseDown={e=>e.stopPropagation()}><header><h2>{title}</h2><button onClick={onClose} aria-label="Close"><X/></button></header>{children}</section></div>}
export const formatDate=(value:string)=>new Intl.DateTimeFormat("en",{month:"short",day:"numeric",year:"numeric"}).format(new Date(value));
export const formatDateTime=(value:string)=>new Intl.DateTimeFormat("en",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}).format(new Date(value));
