import os from 'node:os';
import fsp from 'node:fs/promises';
import multer from 'multer';

// Files go to the OS temp dir (not memory), are validated and moved into GridFS, then deleted.
const uploader = multer({
  dest: os.tmpdir(),
  limits: { fileSize: 200 * 1024 * 1024, files: 1, fields: 20 },
});

/** multer middleware for one file field, plus guaranteed temp-file cleanup when the response ends. */
export function uploadSingle(field = 'file') {
  const parse = uploader.single(field);
  return (req, res, next) => {
    res.on('close', () => {
      if (req.file?.path) fsp.unlink(req.file.path).catch(() => {});
    });
    parse(req, res, next);
  };
}
