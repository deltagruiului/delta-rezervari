// public/js/admin.js
async function fetchRezervari(params = {}){
  const q = new URLSearchParams(params);
  const r = await fetch('/api/admin/rezervari?' + q.toString());
  if(!r.ok) throw new Error('Eroare la încărcarea rezervărilor');
  return await r.json();
}

async function deleteRezervare(id){
  const ok = confirm('Sigur ștergi rezervarea #' + id + '?');
  if(!ok) return false;
  const r = await fetch('/api/admin/rezervari/' + id, { method: 'DELETE' });
  const j = await r.json().catch(() => ({}));
  if(!r.ok || !j.success){ alert(j.error || 'Eroare la ștergere'); return false; }
  return true;
}

function toCsv(rows){
  const head = ['id','data','bazin','loc','nume','telefon'];
  const esc = s => ('"'+String(s).replace(/"/g,'""')+'"');
  const lines = [head.join(',')];
  for(const r of rows){
    lines.push([r.id,r.data,r.bazin,r.loc,r.nume,r.telefon].map(esc).join(','));
  }
  return lines.join('\r\n');
}

function download(filename, text){
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], {type:'text/csv;charset=utf-8;'}));
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

document.addEventListener('DOMContentLoaded', async ()=>{
  const from = document.getElementById('from');
  const to = document.getElementById('to');
  const bazin = document.getElementById('bazin');
  const filtreaza = document.getElementById('filtreaza');
  const reseteaza = document.getElementById('reseteaza');
  const tbody = document.querySelector('#table tbody');
  const statusEl = document.getElementById('status');
  const countEl = document.getElementById('count');
  const exportBtn = document.getElementById('exportCsv');

  let cache = [];

  async function load(){
    statusEl.textContent = 'Se încarcă...';
    try{
      const params = {};
      if(from.value) params.from = from.value;
      if(to.value) params.to = to.value;
      if(bazin.value) params.bazin = bazin.value;
      const j = await fetchRezervari(params);
      cache = Array.isArray(j.rows) ? j.rows : [];
      render(cache);
      statusEl.textContent = 'Gata.';
    }catch(e){
      console.error(e);
      statusEl.textContent = 'Eroare la încărcare';
    }
  }

  function render(rows){
    tbody.innerHTML = '';
    countEl.textContent = rows.length + ' înregistrări';
    for(const r of rows){
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${r.id}</td>
        <td>${r.data}</td>
        <td>${r.bazin}</td>
        <td>${r.loc}</td>
        <td>${r.nume}</td>
        <td><a href="tel:${r.telefon}">${r.telefon}</a></td>
        <td>
          <button class="danger" data-id="${r.id}">Șterge</button>
        </td>
      `;
      tbody.appendChild(tr);
    }
  }

  filtreaza.addEventListener('click', load);
  reseteaza.addEventListener('click', ()=>{
    from.value = ''; to.value = ''; bazin.value = '';
    load();
  });

  tbody.addEventListener('click', async (e)=>{
    const btn = e.target.closest('button.danger');
    if(!btn) return;
    const id = btn.getAttribute('data-id');
    const ok = await deleteRezervare(id);
    if(ok) load();
  });

  exportBtn.addEventListener('click', ()=>{
    if(!cache.length){ alert('Nu sunt date de exportat.'); return; }
    const csv = toCsv(cache);
    const today = new Date().toISOString().slice(0,10);
    download('rezervari_'+today+'.csv', csv);
  });

  // load initial
  load();
});
