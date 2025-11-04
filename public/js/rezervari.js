// public/js/rezervari.js
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

async function afiseazaLocuriDisponibile() {
  const bazin = bazinInput.value;
  const data = dataInput.value;

  if (!bazin || !data) {
    locuriContainer.innerHTML = "";
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
      locuriContainer.innerHTML = "<p style='color:red;'>Toate locurile sunt ocupate pentru această dată.</p>";
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

  } catch (err) {
    console.error(err);
    locuriContainer.innerHTML = "<p style='color:red;'>Eroare la încărcarea locurilor disponibile.</p>";
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
      locuriContainer.innerHTML = "";
    } else {
      mesajDiv.textContent = j.error || "A apărut o eroare la salvare.";
      mesajDiv.style.color = "red";
    }
  } catch (err) {
    console.error(err);
    mesajDiv.textContent = "Eroare de comunicare cu serverul.";
    mesajDiv.style.color = "red";
  }
}
);
