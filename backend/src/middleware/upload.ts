import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { ApiError } from '@/utils/apiError';

const uploadsDir = path.resolve(__dirname, '../../uploads/updates');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    cb(null, uploadsDir);
  },
  filename(_req, file, cb) {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `update-${uniqueSuffix}${ext}`);
  },
});

export const pdfUpload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB max
  fileFilter(_req, file, cb) {
    const mime = (file.mimetype || '').toLowerCase();
    const name = (file.originalname || '').toLowerCase();
    if (mime.includes('pdf') || mime === 'application/octet-stream' || name.endsWith('.pdf')) {
      cb(null, true);
    } else {
      cb(ApiError.badRequest('Only PDF files are allowed for updates.') as any, false);
    }
  },
});
