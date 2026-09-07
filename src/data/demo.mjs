export const companies=[
 {id:'arcwell',name:'Arcwell Cloud',tag:'Recurring revenue · public-style',type:'SaaS',status:'Base case',revenue:186.4,ev:1240,confidence:82},
 {id:'northstar',name:'Northstar Robotics',tag:'Venture-backed · Series B',type:'Early-stage',status:'Hiring case',revenue:8.4,ev:310,confidence:68},
 {id:'meridian',name:'Meridian Components',tag:'Capacity-led · industrial',type:'Asset-intensive',status:'Expansion case',revenue:412,ev:780,confidence:75},
 {id:'fieldnote',name:'Fieldnote Health',tag:'New initiative · stage gate',type:'Initiative',status:'Downside reviewed',revenue:3.2,ev:48,confidence:61}
];
export const periods=['FY22A','FY23A','FY24A','FY25E','FY26E','FY27E','FY28E','FY29E'];
export const rows=[
 {id:'revenue',label:'Revenue',unit:'$m',kind:'section',values:[82.1,108.7,142.3,186.4,235.8,287.7,337.1,382.6],source:'Reported',formula:'Prior year revenue × (1 + growth)'},
 {id:'growth',label:'Revenue growth',unit:'%',values:[null,.324,.309,.31,.265,.22,.172,.135],source:'Model-estimated',formula:'Revenue ÷ prior revenue − 1'},
 {id:'grossprofit',label:'Gross profit',unit:'$m',values:[57.5,77.2,103.9,139.8,180.4,224.4,267.0,306.1],source:'Reported',formula:'Revenue × gross margin'},
 {id:'grossmargin',label:'Gross margin',unit:'%',values:[.70,.71,.73,.75,.765,.78,.792,.80],source:'Inferred',formula:'Gross profit ÷ revenue'},
 {id:'rd',label:'Research & development',unit:'$m',values:[31.2,37.4,43.8,52.2,61.3,69.0,76.2,82.3],source:'Reported',formula:'Revenue × R&D %'},
 {id:'sales',label:'Sales & marketing',unit:'$m',values:[38.6,43.5,48.4,55.9,63.7,69.0,72.5,75.0],source:'Reported',formula:'Revenue × S&M %'},
 {id:'ebitda',label:'Adjusted EBITDA',unit:'$m',kind:'total',values:[-22.3,-17.1,-6.4,12.1,31.8,58.0,83.2,106.7],source:'Model-estimated',formula:'Gross profit − operating expenses'},
 {id:'ufcf',label:'Unlevered free cash flow',unit:'$m',kind:'total',values:[-29.4,-22.0,-12.8,4.8,19.7,42.2,65.9,86.1],source:'Model-estimated',formula:'EBIT × (1−tax) + D&A − capex − ΔNWC'}
];
export const evidence=[
 {id:'ev-001',title:'Arcwell FY24 annual report',date:'2025-02-14',type:'Company filing · bundled demo snapshot',claim:'FY24 revenue was $142.3m',status:'Reported',confidence:98,used:true,excerpt:'Revenue for the year ended December 31, 2024 was $142.3 million.'},
 {id:'ev-014',title:'Cloud Efficiency Benchmark 2025',date:'2025-04-02',type:'Sector benchmark · bundled demo snapshot',claim:'Scaled cloud gross margin range: 72–82%',status:'Externally sourced',confidence:78,used:true,excerpt:'Illustrative synthetic benchmark created for the offline demo.'},
 {id:'ev-021',title:'Management planning note',date:'2025-06-20',type:'Internal memo · fictional',claim:'Enterprise pipeline supports 26–32% FY25 growth',status:'Inferred',confidence:64,used:true,excerpt:'Pipeline coverage and historical conversion imply the range; not a reported forecast.'}
];
export const peers=[{name:'Nimbus Systems',growth:.28,margin:.12,multiple:7.8,included:true},{name:'Ledgerworks',growth:.19,margin:.21,multiple:6.4,included:true},{name:'Polar Cloud',growth:.36,margin:-.04,multiple:8.9,included:true},{name:'Stellate Data',growth:.09,margin:.18,multiple:4.7,included:false}];
