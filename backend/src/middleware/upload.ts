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
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB max
  fileFilter(_req, file, cb) {
    if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
      cb(null, true);
    } else {
      cb(ApiError.badRequest('Only PDF files are allowed for updates.') as any, false);
    }
  },
});
