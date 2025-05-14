import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import dotenv from 'dotenv';
import certificateRoutes from './routes/index.js';
import logger from './utils/logger.js';
import { errorHandler } from './middleware/index.js';

dotenv.config();
const app = express();
app.use(morgan('combined', {
  stream: {
    write: message => logger.info(message.trim())
  }
}))
app.use(cors());
app.use(express.json());

app.use('/api/certificates', certificateRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});
