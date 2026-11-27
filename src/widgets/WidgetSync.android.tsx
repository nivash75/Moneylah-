import MonthWidget from './MonthWidget';
import { useWidgetSync, type WidgetData } from './useWidgetSync';

// Android widgets have no timeline, so a new cycle appears when the app is next opened.
const publish = ({ current }: WidgetData) => MonthWidget.updateSnapshot(current);

/** Keeps the home screen widget up to date. */
export function WidgetSync() {
  useWidgetSync(publish);
  return null;
}
