async function testRender() {
  try {
    const res = await fetch('https://hungryhub-api-itpc.onrender.com/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'ANSH BHATNAGAR',
        email: 'anshbhatnagara@gmail.com',
        password: 'password123',
        role: 'customer',
        phone: '6367154122',
        referred_by: 'n'
      })
    });
    const text = await res.text();
    console.log('STATUS:', res.status);
    console.log('BODY:', text);
  } catch (err) {
    console.error('FETCH ERROR:', err);
  }
}
testRender();
