import BirthdaySite from '../components/BirthdaySite.jsx';
import { demoContent, demoVaultApi, DEMO_VAULT_PASSWORD } from '../demo/demoData.js';
import { useDocumentMeta } from '../hooks/useDocumentMeta.js';
import { BRAND } from '../brand.js';

/**
 * The public live demo. Entirely static and read-only: it is bundled with the app, makes no API calls, and its
 * private area is an in-memory sample, so nothing a visitor does here can read or change anyone's real data.
 */
export default function Demo() {
  useDocumentMeta({ title: `Live demo | ${BRAND.name}`, description: 'Explore a complete birthday surprise website with sample content.' });
  return (
    <BirthdaySite
      data={demoContent}
      mode="demo"
      vaultApi={demoVaultApi}
      vaultHint={`Demo password: ${DEMO_VAULT_PASSWORD}`}
    />
  );
}
