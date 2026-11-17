/**
 * Captain Unique ID Generator
 * Standard:
 * V -> Volo
 * T -> Technician / Captain
 * Trade -> E (Electrician), P (Plumbing), A (AC Repair), C (Carpentry), CL (Cleaning), PT (Painting), G (General)
 * Number -> 4 digit sequence (e.g., 1001, 1002, 1234)
 * Examples: VTE1001, VTP1234, VTA1005
 */

export function resolveCaptainTradeCode(
  skills: string[] = [],
  categoryNames: string[] = []
): string {
  const skillsText = (skills || []).join(' ').toLowerCase();
  const catText = (categoryNames || []).join(' ').toLowerCase();

  // Check specific skills first
  if (skillsText.includes('plumb')) return 'P';
  if (skillsText.includes('electric') || skillsText.includes('wiring') || skillsText.includes('switchboard') || skillsText.includes('fuse') || skillsText.includes('inverter')) return 'E';
  if (/\bac\b|air\s*con|appliance|refrigerat|hvac/i.test(skillsText)) return 'A';
  if (skillsText.includes('clean')) return 'CL';
  if (skillsText.includes('carpent') || skillsText.includes('wood')) return 'C';
  if (skillsText.includes('paint')) return 'PT';

  // Fallback to category names
  if (catText.includes('plumb')) return 'P';
  if (catText.includes('electric')) return 'E';
  if (/\bac\b|air\s*con/i.test(catText)) return 'A';
  if (catText.includes('clean')) return 'CL';
  if (catText.includes('carpent')) return 'C';
  if (catText.includes('paint')) return 'PT';

  return 'E'; // Default trade
}

export async function generateCaptainUniqueId(
  supabaseAdmin: any,
  skills: string[] = [],
  categoryNames: string[] = []
): Promise<string> {
  const tradeCode = resolveCaptainTradeCode(skills, categoryNames);
  const prefix = `VT${tradeCode}`;

  try {
    const { data: existingWorkers } = await supabaseAdmin
      .from('workers')
      .select('worker_id_code')
      .like('worker_id_code', `${prefix}%`);

    let maxNum = 1000;
    if (existingWorkers && existingWorkers.length > 0) {
      for (const w of existingWorkers) {
        if (w.worker_id_code) {
          const numPart = parseInt(w.worker_id_code.replace(prefix, ''), 10);
          if (!isNaN(numPart) && numPart > maxNum) {
            maxNum = numPart;
          }
        }
      }
    }

    let candidate = `${prefix}${maxNum + 1}`;
    let attempts = 0;

    // Check collision safety
    while (attempts < 50) {
      const { data: conflict } = await supabaseAdmin
        .from('workers')
        .select('id')
        .eq('worker_id_code', candidate)
        .maybeSingle();

      if (!conflict) {
        return candidate;
      }
      maxNum++;
      candidate = `${prefix}${maxNum + 1}`;
      attempts++;
    }

    return `${prefix}${Date.now().toString().slice(-4)}`;
  } catch (err) {
    console.warn('Error computing next captain ID code, falling back to random 4-digit:', err);
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}${rand}`;
  }
}
