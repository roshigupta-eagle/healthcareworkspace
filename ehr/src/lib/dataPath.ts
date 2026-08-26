import fs from 'fs';
import path from 'path';

/**
 * Resolves a JSON data file path across different execution contexts
 * (e.g. running from repo root `c:\code\healthcareworkspace` vs `c:\code\healthcareworkspace\ehr`).
 */
export function resolveDataPath(filename: string): string {
  const configuredDirectory = process.env.EHR_DATA_DIR?.trim();
  if (configuredDirectory) {
    const configuredPath = path.resolve(configuredDirectory, filename);
    try { fs.mkdirSync(path.dirname(configuredPath), { recursive: true }); } catch { /* ignore */ }
    return configuredPath;
  }

  const cwd = path.resolve(process.cwd());
  const candidates = [cwd, path.join(cwd, 'ehr'), process.env.INIT_CWD ? path.resolve(process.env.INIT_CWD) : ''];
  const projectDirectory = candidates.find((candidate) => {
    if (!candidate || !fs.existsSync(path.join(candidate, 'package.json'))) return false;
    try { return JSON.parse(fs.readFileSync(path.join(candidate, 'package.json'), 'utf8')).name === 'ehr'; } catch { return false; }
  }) || (path.basename(cwd).toLowerCase() === 'ehr' ? cwd : path.join(cwd, 'ehr'));
  return path.join(projectDirectory, 'data', filename);
}
