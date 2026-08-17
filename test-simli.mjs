async function test() {
  const key = process.env.SIMLI_API_KEY;
  if (!key) {
    console.error("No key"); return;
  }
  const fd = new FormData();
  const buf = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
  
  fd.append("image", new Blob([buf], { type: "image/png" }), "test.png");
  
  const res = await fetch("https://api.simli.ai/faces/legacy?face_name=test", {
    method: "POST",
    headers: { "x-simli-api-key": key },
    body: fd
  });
  
  const text = await res.text();
  console.log("Status:", res.status);
  console.log("Body:", text);
}
test();
