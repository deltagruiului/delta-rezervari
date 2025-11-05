// public/js/rezervari.js — Delta Gruiului (pescuit de zi)

const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

const LOCURI = {
  "Balta Mare": range(1, 43),
  "Balta de la capre": range(44, 53),
  "Balta de la râme": range(54, 61),
  "Balta de la autobuz": range(62, 83),
  "Balta de păstrăv": range(101, 122),
  "Balta de undiță cu copac": range(123, 139)
};

const form = document.getElementById("rezervare-form");
const bazinInput = document.getElementById("bazin");
const dataInput = document.getElementById("data");
const locuriContainer = document.getElementById("locuri-container");
const mesajDiv = document.getElementById("mesaj");
const counterEl = document.getElementById("counter");

function dataInTrecut(val) {
  const azi = new Date(); azi.setHours(0,0,0,0);
  const d = new Date(val); d.setHours(0,0,0,0);
  return d < azi;
}

async function afiseazaLocuriDisponibile() {
  const bazin = bazinInput.value;
  const data = dataInput.value;

  if (!bazin || !data) {
    locuriContainer.innerHTML = "";
    counterEl.textContent = "";
    return;
  }

  if (dataInTrecut(data)) {
    locuriContainer.innerHTML = "<p style='color:#b91c1c'>Data selectată este în trecut.</p>";
    counterEl.textContent = "";
    return;
  }

  try {
    locuriContainer.innerHTML = "<p>Se încarcă locurile disponibile...</p>";

    const raspuns = await fetch(`/api/rezervari/ocupate?bazin=${encodeURIComponent(bazin)}&data=${encodeURIComponent(data)}`);
    if (!raspuns.ok) throw new Error("Eroare la încărcarea locurilor");
    const ocupate = await raspuns.json();

    const toateLocurile = LOCURI[bazin] || [];
    const disponibile = toateLocurile.filter(nr => !ocupate.includes(nr));

    if (disponibile.length === 0) {
      locuriContainer.innerHTML = "<p style='color:#b91c1c;'>Toate locurile sunt ocupate pentru această dată.</p>";
      counterEl.textContent = "";
      return;
    }

    locuriContainer.innerHTML =
      `<p>Alege <strong>maxim 3</strong> locuri disponibile:</p>` +
      disponibile.map(nr => `
        <label style="display:block;margin:4px 0">
          <input type="checkbox" name="locuri" value="${nr}">
          Loc ${nr}
        </label>
      `).join("");

    // Limitează la 3 în timp real + contor
    const checks = Array.from(document.querySelectorAll('input[name="locuri"]'));
    const update = () => {
      const sel = checks.filter(c => c.checked);
      if (sel.length > 3) {
        sel.pop().checked = false;
      }
      counterEl.textContent = sel.length ? `${sel.length}/3 selectate` : "";
    };
    checks.forEach(c => c.addEventListener('change', update));
    update();

  } catch (err) {
    console.error(err);
    locuriContainer.innerHTML = "<p style='color:#b91c1c;'>Eroare la încărcarea locurilor disponibile.</p>";
    counterEl.textContent = "";
  }
}

bazinInput.addEventListener("change", afiseazaLocuriDisponibile);
dataInput.addEventListener("change", afiseazaLocuriDisponibile);

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  mesajDiv.textContent = "";

  const bazin = bazinInput.value;
  const data = dataInput.value;
  const nume = document.getElementById("nume").value.trim();
  const telefon = document.getElementById("telefon").value.trim();
  const locuriSelectate = Array.from(document.querySelectorAll('input[name="locuri"]:checked')).map(i => Number(i.value));

  if (!bazin || !data || !nume || !telefon) {
    mesajDiv.textContent = "Completează toate câmpurile!";
    mesajDiv.style.color = "red";
    return;
  }

  if (dataInTrecut(data)) {
    mesajDiv.textContent = "Data selectată este în trecut.";
    mesajDiv.style.color = "red";
    return;
  }

  if (locuriSelectate.length === 0) {
    mesajDiv.textContent = "Selectează cel puțin un loc!";
    mesajDiv.style.color = "red";
    return;
  }

  if (locuriSelectate.length > 3) {
    mesajDiv.textContent = "Poți rezerva maxim 3 locuri!";
    mesajDiv.style.color = "red";
    return;
  }

  // validare telefon RO simplă: 0 + 9 cifre
  if (!/^0\d{9}$/.test(telefon)) {
    mesajDiv.textContent = "Telefon invalid (ex: 07xxxxxxxx).";
    mesajDiv.style.color = "red";
    return;
  }

  const payload = { bazin, data, nume, telefon, locuri: locuriSelectate };

  try {
    const r = await fetch("/api/rezervari", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const j = await r.json();
    if (r.ok && j.success) {
      mesajDiv.textContent = "✅ Rezervarea a fost înregistrată cu succes!";
      mesajDiv.style.color = "green";
      form.reset();
      counterEl.textContent = "";
      // reîncarcă disponibilitatea pentru aceeași balta+dată
      await afiseazaLocuriDisponibile();
    } else {
      mesajDiv.textContent = j.error || "A apărut o eroare la salvare.";
      mesajDiv.style.color = "red";
    }
  } catch (err) {
    console.error(err);
    mesajDiv.textContent = "Eroare de comunicare cu serverul.";
    mesajDiv.style.color = "red";
  }
});
