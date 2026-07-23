const base=import.meta.env.VITE_API_URL||"";
export async function api<T>(path:string,options:RequestInit={}):Promise<T>{
  const token=localStorage.getItem("careflow_token");
  const response=await fetch(`${base}/api${path}`,{...options,headers:{"Content-Type":"application/json",...(token?{Authorization:`Bearer ${token}`}:{ }),...options.headers}});
  if(!response.ok){const body=await response.json().catch(()=>({error:"request_failed"}));throw new Error(body.error||`HTTP ${response.status}`)}
  return response.json();
}
