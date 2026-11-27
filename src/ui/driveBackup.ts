import { Alert, Platform } from 'react-native';
import { Directory, File } from 'expo-file-system';
import { toBackup } from '../core/backup';
import { localDay } from '../core/csv';
import { useStore } from '../data/store';

const DAY = 86_400_000;

const daysSince = (ms: number) => Math.round((new Date().setHours(0, 0, 0, 0) - new Date(ms).setHours(0, 0, 0, 0)) / DAY);

export function backupStatus(last: number) {
  if (!last) return 'Never backed up';
  const days = daysSince(last);
  return days <= 0 ? 'Last backup today' : days === 1 ? 'Last backup yesterday' : `Last backup ${days} days ago`;
}

/** Saves a backup into a folder the user picks. A free Apple account can't use iCloud directly. */
export function useDriveBackup() {
  const { state, update } = useStore();

  const save = async () => {
    let folder: Directory;
    try {
      folder = await Directory.pickDirectoryAsync();
    } catch (error) {
      if (error instanceof Error && /cancell?ed/i.test(error.message)) return;
      throw error;
    }
    const now = new Date();
    const name = `moneylah-backup-${localDay(now.getTime())}.json`;
    let file: File;
    // Android folders are opened by permission, so the folder itself has to create the file.
    if (Platform.OS === 'android') file = folder.createFile(name, 'application/json');
    else {
      file = new File(folder, name);
      file.create({ overwrite: true });
    }
    file.write(toBackup(state));
    update((s) => ({ ...s, settings: { ...s.settings, lastBackup: now.getTime() } }));
    // Android renames a second backup made the same day, so report the name it actually used.
    if (Platform.OS === 'android') Alert.alert('Backup saved', `${decodeURIComponent(file.uri).split('/').pop()} was saved in the folder you picked.`);
    // iCloud Drive folders live under "Mobile Documents".
    else if (decodeURIComponent(folder.uri).includes('/Mobile Documents/')) Alert.alert('Saved to iCloud Drive', `${file.name} uploads when this device is online.`);
    else Alert.alert('Backup saved', `${file.name} was saved, but that folder isn't in iCloud Drive. To keep a copy in iCloud, back up again and pick an iCloud Drive folder.`);
  };

  return () => void save().catch((error: unknown) => Alert.alert('Backup failed', error instanceof Error ? error.message : String(error)));
}
