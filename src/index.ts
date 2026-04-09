
import { Hono } from 'hono';
import { handleInteractions } from './routes/interactions';

const app = new Hono();
app.post('/api/interactions', handleInteractions);
export default app;