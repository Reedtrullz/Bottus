import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const SISYPHUS_PATH = process.env.SISYPHUS_PATH || './.sisyphus';
const BACKUP_PATH = path.join(SISYPHUS_PATH, 'backups');

export async function createBackup(): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(BACKUP_PATH, timestamp);
  
  fs.mkdirSync(backupDir, { recursive: true });

  const dbs = ['calendar.db', 'interactions.db'];
  for (const db of dbs) {
    const src = path.join(SISYPHUS_PATH, db);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(backupDir, db));
    }
  }

  const notepadsSrc = path.join(SISYPHUS_PATH, 'notepads');
  if (fs.existsSync(notepadsSrc)) {
    const notepadsDest = path.join(backupDir, 'notepads');
    fs.cpSync(notepadsSrc, notepadsDest, { recursive: true });
  }

  const tarball = path.join(BACKUP_PATH, `backup-${timestamp}.tar.gz`);
  await execAsync(`tar -czf ${tarball} -C ${BACKUP_PATH} ${timestamp}`);
  
  fs.rmSync(backupDir, { recursive: true });

  console.log(`Backup created: ${tarball}`);
  return tarball;
}

export async function rotateBackups(maxBackups = 7): Promise<void> {
  if (!fs.existsSync(BACKUP_PATH)) return;

  const files = fs.readdirSync(BACKUP_PATH)
    .filter(f => f.startsWith('backup-') && f.endsWith('.tar.gz'))
    .map(f => ({
      name: f,
      path: path.join(BACKUP_PATH, f),
      mtime: fs.statSync(path.join(BACKUP_PATH, f)).mtime.getTime(),
    }))
    .sort((a, b) => b.mtime - a.mtime);

  for (let i = maxBackups; i < files.length; i++) {
    fs.unlinkSync(files[i].path);
    console.log(`Removed old backup: ${files[i].name}`);
  }
}
