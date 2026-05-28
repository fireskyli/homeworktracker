import app from './app';
import { startAutoBackup } from './backup';
import { initPresetExercises } from './db';

const PORT = Number(process.env.PORT) || 3000;

app.listen(PORT, '0.0.0.0', async () => {
  console.log(`Server running at http://localhost:${PORT}`);
  await initPresetExercises();
  startAutoBackup();
});
