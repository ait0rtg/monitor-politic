import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
export async function GET() {
  const supabase=createClient()
  const {data:{user}}=await supabase.auth.getUser()
  if(!user) return NextResponse.json({error:'No autenticat.'},{status:401})
  const {data}=await supabase.from('monitoratge').select('titol,font,classificacio,data_deteccio,venciment,import_detectat,tema_principal,estat_seguiment,url_original').order('data_deteccio',{ascending:false}).limit(5000)
  if(!data) return NextResponse.json({error:'Error.'},{status:500})
  const headers=['Títol','Font','Classificació','Data','Venciment','Import','Tema','Estat','URL']
  const rows=data.map(d=>[`"${(d.titol||'').replace(/"/g,'""')}"`,d.font||'',d.classificacio||'',d.data_deteccio?.split('T')[0]||'',d.venciment||'',d.import_detectat||'',d.tema_principal||'',d.estat_seguiment||'',d.url_original||''].join(','))
  const csv=[headers.join(','),...rows].join('\n')
  return new NextResponse(csv,{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="monitor-politic.csv"'}})
}
