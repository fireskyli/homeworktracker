import app from './app';

const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`LAN access: http://192.168.10.19:${PORT}`);
});
