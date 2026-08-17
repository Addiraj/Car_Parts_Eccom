import fs from 'fs';
async function test() {
  const key = process.env.SIMLI_API_KEY;
  const fd = new FormData();
  const buf = fs.readFileSync('test512.png');
  fd.append("image", new Blob([buf], { type: "image/png" }), "test.png");
  
  const res = await fetch("https://api.simli.ai/faces/legacy?face_name=test", {
    method: "POST",
    headers: { "x-simli-api-key": key },
    body: fd
  });
  
  const text = await res.text();
  console.log("Upload Status:", res.status);
  console.log("Upload Body:", text);
  
  try {
    const data = JSON.parse(text);
    const faceId = data.face_id || data.id || data.character_uid;
    console.log("Face ID:", faceId);
    if (faceId) {
      const tokenRes = await fetch("https://api.simli.ai/compose/token", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-simli-api-key": key },
        body: JSON.stringify({ faceId })
      });
      console.log("Token Status:", tokenRes.status);
      console.log("Token Body:", await tokenRes.text());
    }
  } catch(e) { console.error(e) }
}
test();
