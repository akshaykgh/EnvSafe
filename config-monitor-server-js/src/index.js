import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { setupRoutes } from './routes/index.js';
import { initializeDatabase } from './database/init.js';

const app = express();
const PORT = config.port || 8080;

// Middleware
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:5173'],
    credentials: true
}));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'UP' });
});

// Setup routes
setupRoutes(app);

// Initialize database
initializeDatabase().then(() => {
    console.log('Database initialized');
    
    // Start server
    app.listen(PORT, () => {
        console.log(`Config Monitor Server running on http://localhost:${PORT}`);
    });
}).catch(err => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
});
