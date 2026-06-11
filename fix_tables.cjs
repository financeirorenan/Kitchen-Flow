const fs = require('fs');
const path = './components/Tables.tsx';
let content = fs.readFileSync(path, 'utf8');

const startTag = '{cashReport && cashReport.sessionRecords.length > 0 && (';
const endTag = '<div className="space-y-4">';

const startIndex = content.indexOf(startTag);
const endIndex = content.indexOf(endTag, startIndex);

if (startIndex !== -1 && endIndex !== -1) {
    const head = content.substring(0, startIndex);
    const tail = content.substring(endIndex);
    const middle = `{cashReport && cashReport.sessionRecords.length > 0 && (
                         <div className="space-y-2">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 ml-1">
                               <History size={14} /> Movimentações do Turno
                            </h3>
                            <div className="bg-slate-50 rounded-2xl border border-slate-100 divide-y divide-slate-100 max-h-[120px] overflow-y-auto custom-scrollbar">
                               {cashReport.sessionRecords
                                 .filter(r => !((r.category || "").toLowerCase().startsWith("venda")))
                                 .map(record => (
                                  <div key={record.id} className="p-3 flex justify-between items-center bg-white/50">
                                     <div className="flex flex-col">
                                        <div className="flex items-center gap-2">
                                           <div className={` + '`w-1.5 h-1.5 rounded-full ${record.type === "income" ? "bg-emerald-500" : "bg-rose-500"}`' + `} />
                                           <span className="text-[10px] font-black text-slate-800 truncate max-w-[200px]">{record.description}</span>
                                        </div>
                                        <span className="text-[8px] font-bold text-slate-400 ml-3.5">
                                           {record.date instanceof Date ? record.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : new Date(record.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • 
                                           <span className="uppercase ml-1">{record.category}</span>
                                        </span>
                                     </div>
                                     <span className={` + '`text-[10px] font-black ${record.type === "income" ? "text-emerald-500" : "text-rose-500"}`' + `}>
                                        {record.type === 'income' ? '+' : '-'} R$ {record.amount.toFixed(2)}
                                     </span>
                                  </div>
                               ))}
                            </div>
                         </div>
                       )}

                       `;
    fs.writeFileSync(path, head + middle + tail);
    console.log('Success.');
} else {
    console.log('Error: Tags not found.');
}
