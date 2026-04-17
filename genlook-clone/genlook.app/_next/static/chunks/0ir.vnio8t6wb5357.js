(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,19065,e=>{"use strict";let r=(0,e.i(85187).default)("download",[["path",{d:"M12 15V3",key:"m9g1x1"}],["path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4",key:"ih7n3h"}],["path",{d:"m7 10 5 5 5-5",key:"brsn70"}]]);e.s(["Download",0,r],19065)},81847,e=>{"use strict";let r=(0,e.i(85187).default)("copy",[["rect",{width:"14",height:"14",x:"8",y:"8",rx:"2",ry:"2",key:"17jyea"}],["path",{d:"M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2",key:"zix9uf"}]]);e.s(["Copy",0,r],81847)},17290,e=>{"use strict";var r=e.i(24163),t=e.i(49104),a=e.i(14487),s=e.i(81847),o=e.i(43601),d=e.i(19065);let l=[{size:"XS",chest:"32-34",waist:"24-26",hips:"34-36"},{size:"S",chest:"34-36",waist:"26-28",hips:"36-38"},{size:"M",chest:"36-38",waist:"28-30",hips:"38-40"},{size:"L",chest:"38-40",waist:"30-32",hips:"40-42"},{size:"XL",chest:"40-42",waist:"32-34",hips:"42-44"},{size:"XXL",chest:"42-44",waist:"34-36",hips:"44-46"}],i=[{us:"0",eu:"32",uk:"4"},{us:"2",eu:"34",uk:"6"},{us:"4",eu:"36",uk:"8"},{us:"6",eu:"38",uk:"10"},{us:"8",eu:"40",uk:"12"},{us:"10",eu:"42",uk:"14"},{us:"12",eu:"44",uk:"16"},{us:"14",eu:"46",uk:"18"},{us:"16",eu:"48",uk:"20"},{us:"18",eu:"50",uk:"22"}],c=[{name:"Blue",value:"#3b82f6"},{name:"Purple",value:"#8b5cf6"},{name:"Pink",value:"#ec4899"},{name:"Green",value:"#10b981"},{name:"Orange",value:"#f59e0b"},{name:"Red",value:"#ef4444"},{name:"Gray",value:"#6b7280"},{name:"Black",value:"#000000"}],n={minimal:{headerBg:"#ffffff",headerText:"#000000",border:"1px solid #e5e7eb",rowHover:"#f9fafb",bg:"#ffffff"},modern:{headerBg:"#000000",headerText:"#ffffff",border:"1px solid #e5e7eb",rowHover:"#f9fafb",bg:"#ffffff"},classic:{headerBg:"#f3f4f6",headerText:"#1f2937",border:"1px solid #d1d5db",rowHover:"#f9fafb",bg:"#ffffff"},colorful:{headerBg:"#3b82f6",headerText:"#ffffff",border:"none",rowHover:"#eff6ff",bg:"#ffffff"}};e.s(["default",0,function(){let e=(0,a.useTranslations)("size-chart-generator-tool"),[u,m]=(0,t.useState)("basic"),[b,x]=(0,t.useState)(l),[h,f]=(0,t.useState)(i),[v,p]=(0,t.useState)({theme:"modern",headerColor:c[0].value}),[g,y]=(0,t.useState)(!1),[j,k]=(0,t.useState)("");(0,t.useEffect)(()=>{N()},[u,b,h,v]);let N=()=>{let r=n[v.theme],t="colorful"===v.theme?v.headerColor:r.headerBg,a="colorful"===v.theme?"#ffffff":r.headerText,s="",o="";s="basic"===u?`<div class="size-chart-container">
  <table class="size-chart-table">
    <thead>
      <tr>
        <th>${e("agOXPD")}</th>
        <th>${e("UJdYjD")} (in)</th>
        <th>${e("+VhK3D")} (in)</th>
        <th>${e("RDATDc")} (in)</th>
      </tr>
    </thead>
    <tbody>
${b.map(e=>`      <tr>
        <td>${e.size}</td>
        <td>${e.chest}</td>
        <td>${e.waist}</td>
        <td>${e.hips}</td>
      </tr>`).join("\n")}
    </tbody>
  </table>
</div>`:`<div class="size-chart-container">
  <table class="size-chart-table">
    <thead>
      <tr>
        <th>${e("inZ2fY")}</th>
        <th>${e("yBERKU")}</th>
        <th>${e("9N69Wd")}</th>
      </tr>
    </thead>
    <tbody>
${h.map(e=>`      <tr>
        <td>${e.us}</td>
        <td>${e.eu}</td>
        <td>${e.uk}</td>
      </tr>`).join("\n")}
    </tbody>
  </table>
</div>`,o=`<style>
.size-chart-container {
  width: 100%;
  margin: 1.5rem 0;
  overflow-x: auto;
}

.size-chart-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9375rem;
  background-color: ${r.bg};
  ${"minimal"===v.theme?"box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);":""}
  ${"classic"===v.theme?"border: 1px solid #d1d5db;":""}
}

.size-chart-table thead {
  background-color: ${t};
}

.size-chart-table th {
  padding: 0.875rem 1rem;
  text-align: left;
  font-weight: 600;
  color: ${a};
  ${"minimal"===v.theme?"text-transform: uppercase; letter-spacing: 0.05em; font-size: 0.75rem;":""}
  ${"modern"===v.theme?"text-transform: uppercase; letter-spacing: 0.1em; font-size: 0.8125rem;":""}
  ${"classic"===v.theme?"border-bottom: 2px solid #9ca3af;":""}
  ${"colorful"===v.theme?"text-transform: uppercase; letter-spacing: 0.05em; font-size: 0.8125rem;":""}
}

.size-chart-table td {
  padding: 0.875rem 1rem;
  border-top: ${r.border};
  color: #374151;
  ${"classic"===v.theme?"border-left: 1px solid #e5e7eb;":""}
}

.size-chart-table tbody tr:hover {
  background-color: ${r.rowHover};
}

.size-chart-table tbody tr:last-child td {
  border-bottom: ${r.border};
}

@media (max-width: 640px) {
  .size-chart-table {
    font-size: 0.8125rem;
  }
  
  .size-chart-table th,
  .size-chart-table td {
    padding: 0.75rem 0.5rem;
  }
}
</style>`,k(`${o}

${s}`)},w=async()=>{try{await navigator.clipboard.writeText(j),y(!0),setTimeout(()=>y(!1),2e3)}catch(e){console.error("Failed to copy:",e)}},$=(e,r,t)=>{let a=[...b];a[e]={...a[e],[r]:t},x(a)},C=(e,r,t)=>{let a=[...h];a[e]={...a[e],[r]:t},f(a)};return(0,r.jsxs)("div",{className:"grid gap-6 lg:grid-cols-[1fr_1.1fr]",children:[(0,r.jsxs)("div",{className:"space-y-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4",children:[(0,r.jsxs)("div",{children:[(0,r.jsx)("label",{className:"mb-2 block text-xs font-medium text-[var(--muted)]",children:e("yhJabc")}),(0,r.jsxs)("div",{className:"grid grid-cols-2 gap-2",children:[(0,r.jsx)("button",{onClick:()=>m("basic"),className:`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${"basic"===u?"border-[var(--primary)] bg-[var(--primary-muted)] text-[var(--primary-dark)]":"border-[var(--border)] bg-[var(--surface-muted)] text-[var(--muted)]"}`,children:e("fNCCY7")}),(0,r.jsx)("button",{onClick:()=>m("numeric"),className:`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${"numeric"===u?"border-[var(--primary)] bg-[var(--primary-muted)] text-[var(--primary-dark)]":"border-[var(--border)] bg-[var(--surface-muted)] text-[var(--muted)]"}`,children:e("uaNMpp")})]})]}),(0,r.jsxs)("div",{children:[(0,r.jsx)("label",{className:"mb-2 block text-xs font-medium text-[var(--muted)]",children:e("xvbP3W")}),(0,r.jsxs)("div",{className:"grid grid-cols-2 gap-2",children:[(0,r.jsx)("button",{onClick:()=>p({...v,theme:"minimal"}),className:`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${"minimal"===v.theme?"border-[var(--primary)] bg-[var(--primary-muted)] text-[var(--primary-dark)]":"border-[var(--border)] bg-[var(--surface-muted)] text-[var(--muted)]"}`,children:e("2FljS4")}),(0,r.jsx)("button",{onClick:()=>p({...v,theme:"modern"}),className:`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${"modern"===v.theme?"border-[var(--primary)] bg-[var(--primary-muted)] text-[var(--primary-dark)]":"border-[var(--border)] bg-[var(--surface-muted)] text-[var(--muted)]"}`,children:e("SyR1qP")}),(0,r.jsx)("button",{onClick:()=>p({...v,theme:"classic"}),className:`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${"classic"===v.theme?"border-[var(--primary)] bg-[var(--primary-muted)] text-[var(--primary-dark)]":"border-[var(--border)] bg-[var(--surface-muted)] text-[var(--muted)]"}`,children:e("HJEJo0")}),(0,r.jsx)("button",{onClick:()=>p({...v,theme:"colorful"}),className:`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${"colorful"===v.theme?"border-[var(--primary)] bg-[var(--primary-muted)] text-[var(--primary-dark)]":"border-[var(--border)] bg-[var(--surface-muted)] text-[var(--muted)]"}`,children:e("twm3KF")})]})]}),"colorful"===v.theme&&(0,r.jsxs)("div",{children:[(0,r.jsx)("label",{className:"mb-2 block text-xs font-medium text-[var(--muted)]",children:e("iB1g2r")}),(0,r.jsx)("div",{className:"grid grid-cols-4 gap-1.5",children:c.map(e=>(0,r.jsx)("button",{onClick:()=>p({...v,headerColor:e.value}),className:`h-8 w-full rounded border-2 transition-all ${v.headerColor===e.value?"border-[var(--primary)] ring-1 ring-[var(--primary)]":"border-[var(--border)]"}`,style:{backgroundColor:e.value},title:e.name},e.value))})]}),(0,r.jsxs)("div",{children:[(0,r.jsxs)("div",{className:"mb-2 flex items-center justify-between",children:[(0,r.jsx)("label",{className:"text-xs font-medium text-[var(--muted)]",children:e("jFOmGM")}),"basic"===u?(0,r.jsx)("button",{onClick:()=>{x([...b,{size:"",chest:"",waist:"",hips:""}])},className:"text-xs text-[var(--primary)] hover:underline",children:e("2hsoiX")}):(0,r.jsx)("button",{onClick:()=>{f([...h,{us:"",eu:"",uk:""}])},className:"text-xs text-[var(--primary)] hover:underline",children:e("2hsoiX")})]}),(0,r.jsx)("div",{className:"max-h-64 space-y-1.5 overflow-y-auto",children:"basic"===u?b.map((t,a)=>(0,r.jsxs)("div",{className:"flex items-center gap-1",children:[(0,r.jsx)("input",{type:"text",value:t.size,onChange:e=>$(a,"size",e.target.value),placeholder:e("Dap8yY"),className:"w-12 rounded border border-[var(--border)] bg-[var(--surface-muted)] px-2 py-1 text-xs focus:border-[var(--primary)] focus:outline-none"}),(0,r.jsx)("input",{type:"text",value:t.chest,onChange:e=>$(a,"chest",e.target.value),placeholder:e("UJdYjD"),className:"flex-1 rounded border border-[var(--border)] bg-[var(--surface-muted)] px-2 py-1 text-xs focus:border-[var(--primary)] focus:outline-none"}),(0,r.jsx)("input",{type:"text",value:t.waist,onChange:e=>$(a,"waist",e.target.value),placeholder:e("+VhK3D"),className:"flex-1 rounded border border-[var(--border)] bg-[var(--surface-muted)] px-2 py-1 text-xs focus:border-[var(--primary)] focus:outline-none"}),(0,r.jsx)("input",{type:"text",value:t.hips,onChange:e=>$(a,"hips",e.target.value),placeholder:e("RDATDc"),className:"flex-1 rounded border border-[var(--border)] bg-[var(--surface-muted)] px-2 py-1 text-xs focus:border-[var(--primary)] focus:outline-none"}),b.length>1&&(0,r.jsx)("button",{onClick:()=>{b.length>1&&x(b.filter((e,r)=>r!==a))},className:"rounded border border-[var(--border)] bg-[var(--surface-muted)] px-2 py-1 text-xs text-[var(--muted)] hover:bg-[var(--surface)]",children:"×"})]},a)):h.map((t,a)=>(0,r.jsxs)("div",{className:"flex items-center gap-1",children:[(0,r.jsx)("input",{type:"text",value:t.us,onChange:e=>C(a,"us",e.target.value),placeholder:e("inZ2fY"),className:"flex-1 rounded border border-[var(--border)] bg-[var(--surface-muted)] px-2 py-1 text-xs focus:border-[var(--primary)] focus:outline-none"}),(0,r.jsx)("input",{type:"text",value:t.eu,onChange:e=>C(a,"eu",e.target.value),placeholder:e("yBERKU"),className:"flex-1 rounded border border-[var(--border)] bg-[var(--surface-muted)] px-2 py-1 text-xs focus:border-[var(--primary)] focus:outline-none"}),(0,r.jsx)("input",{type:"text",value:t.uk,onChange:e=>C(a,"uk",e.target.value),placeholder:e("9N69Wd"),className:"flex-1 rounded border border-[var(--border)] bg-[var(--surface-muted)] px-2 py-1 text-xs focus:border-[var(--primary)] focus:outline-none"}),h.length>1&&(0,r.jsx)("button",{onClick:()=>{h.length>1&&f(h.filter((e,r)=>r!==a))},className:"rounded border border-[var(--border)] bg-[var(--surface-muted)] px-2 py-1 text-xs text-[var(--muted)] hover:bg-[var(--surface)]",children:"×"})]},a))})]})]}),(0,r.jsxs)("div",{className:"flex flex-col gap-4",children:[(0,r.jsxs)("div",{className:"rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4",children:[(0,r.jsx)("h3",{className:"mb-3 text-sm font-semibold text-[var(--foreground)]",children:e("TJo5E6")}),(0,r.jsx)("div",{className:"overflow-x-auto rounded border border-[var(--border)] bg-white p-3",children:(0,r.jsx)("div",{dangerouslySetInnerHTML:{__html:j}})})]}),(0,r.jsxs)("div",{className:"flex flex-1 flex-col rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4",children:[(0,r.jsxs)("div",{className:"mb-3 flex items-center justify-between",children:[(0,r.jsx)("h3",{className:"text-sm font-semibold text-[var(--foreground)]",children:e("h2vipu")}),(0,r.jsxs)("div",{className:"flex gap-1.5",children:[(0,r.jsxs)("button",{onClick:w,className:"inline-flex items-center gap-1 rounded border border-[var(--border)] bg-[var(--surface-muted)] px-2.5 py-1.5 text-xs font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface)] hover:border-[var(--primary)]",children:[g?(0,r.jsx)(o.Check,{className:"h-3 w-3"}):(0,r.jsx)(s.Copy,{className:"h-3 w-3"}),g?e("p556q3"):e("4l6vz1")]}),(0,r.jsx)("button",{onClick:()=>{let e=new Blob([j],{type:"text/html"}),r=URL.createObjectURL(e),t=document.createElement("a");t.href=r,t.download="size-chart.html",document.body.appendChild(t),t.click(),document.body.removeChild(t),URL.revokeObjectURL(r)},className:"inline-flex items-center gap-1 rounded border border-[var(--border)] bg-[var(--surface-muted)] px-2.5 py-1.5 text-xs font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface)] hover:border-[var(--primary)]",children:(0,r.jsx)(d.Download,{className:"h-3 w-3"})})]})]}),(0,r.jsx)("div",{className:"flex-1 overflow-auto rounded border border-[var(--border)] bg-[var(--surface-muted)] p-2",children:(0,r.jsx)("pre",{className:"text-[10px] text-[var(--muted)]",children:(0,r.jsx)("code",{children:j})})})]})]})]})}])}]);