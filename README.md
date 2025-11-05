# Delta Gruiului – Rezervări Node.js (varianta token)

## Instalare rapidă
```bash
npm install
npm run init-db
cp .env.example .env
# editează .env și setează ADMIN_TOKEN la o valoare lungă
npm start
```

- Formular vizitatori: `http://localhost:3000/rezerva`
- Panou Admin: `http://localhost:3000/admin` (introdu `X-Admin-Token` în câmpul din UI)

## Integrare în site
În `info.html`, adaugă un buton:
```html
<a class="btn btn-primary" href="/rezerva">Rezervă online</a>
```
