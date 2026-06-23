async function test() {
  try {
    const res = await fetch('http://localhost:5000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test',
        email: 'test@example.com',
        password: 'password123',
        role: 'customer',
        phone: '1234567890',
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
test();
