async function trigger() {
  try {
    const res = await fetch('https://api.render.com/v1/services/srv-d8tepq3eo5us73di0gb0/deploys', {
      method: 'POST',
      headers: { 
        'Authorization': 'Bearer rnd_6f0NLYfnqW1FWYucNKxJyZ2xyoRQ',
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ clearCache: "clear" })
    });
    console.log(await res.text());
  } catch(e) { console.error(e); }
}
trigger();
